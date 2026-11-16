import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { JobStatus, OrderStatus, ProductionStage } from '@yamban/shared';
import { and, eq, inArray } from 'drizzle-orm';
import { CostingService } from '../costing/costing.service.js';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { orders, payments, productionJobs } from '../db/schema/index.js';
import { InventoryService } from '../inventory/inventory.service.js';

/** Machine-readable `code` on the 409s this service throws (the web app switches on it). */
export type JobTransitionErrorCode =
  | 'JOB_NOT_PENDING'
  | 'JOB_NOT_IN_PROGRESS'
  | 'PREVIOUS_STAGE_OPEN'
  | 'DOWN_PAYMENT_REQUIRED'
  | 'ORDER_NOT_IN_PRODUCTION';

export interface StartJobOptions {
  /** PRINTING only: start even though the order has no payment yet. */
  acknowledgeNoPayment?: boolean;
  /** Recorded on the consumption ledger rows. */
  userId?: string | null;
}

export interface CompleteJobOptions {
  userId?: string | null;
  /** Start the job first if it is still PENDING (design ready: the design board has no start button). */
  startIfPending?: boolean;
}

export interface NextJobState {
  id: string;
  stage: ProductionStage;
  status: JobStatus;
  /** Set when the next stage could not start on its own. */
  waitingFor?: 'DOWN_PAYMENT';
}

export interface CompleteJobResult {
  success: true;
  alreadyCompleted?: true;
  nextJob?: NextJobState;
  orderStatus: OrderStatus;
}

interface LockedJob {
  id: string;
  orderId: string;
  orderItemId: string;
  stage: ProductionStage;
  sequence: number;
  status: JobStatus;
}

interface LockedOrder {
  id: string;
  status: OrderStatus;
  electricityRatePerKwh: string | null;
}

function conflict(code: JobTransitionErrorCode, message: string): ConflictException {
  return new ConflictException({ code, message });
}

const STAGE_NAMES: Record<ProductionStage, string> = {
  DESIGN: 'design',
  PRINTING: 'printing',
  HEAT_PRESS: 'heat press',
  SEWING: 'sewing',
  PACKAGING: 'packaging',
};

/**
 * The only writer of `production_jobs.status` and of the production-driven order status
 * (CONFIRMED → IN_PRODUCTION → READY).
 *
 * - A job goes PENDING → IN_PROGRESS → COMPLETED, nothing else.
 * - A job starts only when the job before it (by `sequence`, same order item) is COMPLETED.
 * - Starting a job deducts that stage's materials (once per `order_materials` line) and,
 *   for PRINTING, requires a payment or an explicit acknowledgement.
 * - Completing a job starts the next one through the same start path. If the next one is
 *   PRINTING and the order has no payment, it stays PENDING for the printer to acknowledge.
 * - The first start moves the order to IN_PRODUCTION; when no job is left open the order
 *   becomes READY and its actual costs are computed.
 *
 * Every transition runs in one transaction and locks the order row first, so transitions of
 * the same order are serialised (no double start, no missed READY when two items finish together).
 */
@Injectable()
export class JobTransitions {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly inventory: InventoryService,
    private readonly costing: CostingService,
  ) {}

  /** PENDING → IN_PROGRESS. */
  async start(jobId: string, opts: StartJobOptions = {}): Promise<{ success: true; orderStatus: OrderStatus }> {
    return this.db.transaction(async (tx) => {
      const { job, order } = await this.lock(tx, jobId);
      await this.startLocked(tx, job, order, opts);
      return { success: true as const, orderStatus: order.status };
    });
  }

  /** IN_PROGRESS → COMPLETED, then start the next stage, then READY when nothing is left open. */
  async complete(jobId: string, opts: CompleteJobOptions = {}): Promise<CompleteJobResult> {
    return this.db.transaction(async (tx) => {
      const { job, order } = await this.lock(tx, jobId);

      // Idempotent: a double click or a retry is not an error.
      if (job.status === 'COMPLETED') {
        return { success: true as const, alreadyCompleted: true as const, orderStatus: order.status };
      }
      if (job.status === 'PENDING' && opts.startIfPending) {
        await this.startLocked(tx, job, order, { userId: opts.userId });
        job.status = 'IN_PROGRESS';
      }
      if (job.status !== 'IN_PROGRESS') {
        throw conflict(
          'JOB_NOT_IN_PROGRESS',
          job.status === 'CANCELLED' ? 'This job was cancelled.' : 'Start this job before completing it.',
        );
      }

      const done = await tx
        .update(productionJobs)
        .set({ status: 'COMPLETED', completedAt: new Date() })
        .where(and(eq(productionJobs.id, job.id), eq(productionJobs.status, 'IN_PROGRESS')))
        .returning({ id: productionJobs.id });
      if (done.length === 0) throw conflict('JOB_NOT_IN_PROGRESS', 'Start this job before completing it.');

      const nextJob = await this.startNext(tx, job, order, opts.userId);
      const orderStatus = await this.finishOrderIfDone(tx, order);

      return { success: true as const, ...(nextJob ? { nextJob } : {}), orderStatus };
    });
  }

  // ── internals ───────────────────────────────────────────────────────────────

  /** Locks the order row, then the job row (always in that order, so no deadlocks). */
  private async lock(tx: Database, jobId: string): Promise<{ job: LockedJob; order: LockedOrder }> {
    const [ref] = await tx
      .select({ orderId: productionJobs.orderId })
      .from(productionJobs)
      .where(eq(productionJobs.id, jobId))
      .limit(1);
    if (!ref) throw new NotFoundException('Job not found.');

    const [order] = await tx
      .select({ id: orders.id, status: orders.status, electricityRatePerKwh: orders.electricityRatePerKwh })
      .from(orders)
      .where(eq(orders.id, ref.orderId))
      .for('update');
    if (!order) throw new NotFoundException('Order not found.');

    const [job] = await tx
      .select({
        id: productionJobs.id,
        orderId: productionJobs.orderId,
        orderItemId: productionJobs.orderItemId,
        stage: productionJobs.stage,
        sequence: productionJobs.sequence,
        status: productionJobs.status,
      })
      .from(productionJobs)
      .where(eq(productionJobs.id, jobId))
      .for('update');
    if (!job) throw new NotFoundException('Job not found.');

    return { job, order };
  }

  /** The single start path. Caller holds the order and job locks. */
  private async startLocked(tx: Database, job: LockedJob, order: LockedOrder, opts: StartJobOptions): Promise<void> {
    if (job.status !== 'PENDING') {
      throw conflict(
        'JOB_NOT_PENDING',
        job.status === 'COMPLETED' ? 'This job is already finished.' : 'This job has already started.',
      );
    }
    if (order.status !== 'CONFIRMED' && order.status !== 'IN_PRODUCTION') {
      throw conflict('ORDER_NOT_IN_PRODUCTION', `This order is ${order.status.toLowerCase().replace('_', ' ')}, so its jobs cannot start.`);
    }

    const [previous] = await tx
      .select({ stage: productionJobs.stage, status: productionJobs.status })
      .from(productionJobs)
      .where(and(eq(productionJobs.orderItemId, job.orderItemId), eq(productionJobs.sequence, job.sequence - 1)))
      .limit(1);
    if (previous && previous.status !== 'COMPLETED') {
      throw conflict('PREVIOUS_STAGE_OPEN', `Finish ${STAGE_NAMES[previous.stage]} first.`);
    }

    if (job.stage === 'PRINTING' && !opts.acknowledgeNoPayment && !(await this.hasPayment(tx, job.orderId))) {
      throw conflict('DOWN_PAYMENT_REQUIRED', 'No down payment recorded.');
    }

    await this.inventory.consumeMaterialsForStage(tx, job.orderItemId, job.stage, opts.userId ?? null);

    const started = await tx
      .update(productionJobs)
      .set({ status: 'IN_PROGRESS', startedAt: new Date() })
      .where(and(eq(productionJobs.id, job.id), eq(productionJobs.status, 'PENDING')))
      .returning({ id: productionJobs.id });
    if (started.length === 0) throw conflict('JOB_NOT_PENDING', 'This job has already started.');

    if (order.status === 'CONFIRMED') {
      await tx
        .update(orders)
        .set({ status: 'IN_PRODUCTION' })
        .where(and(eq(orders.id, order.id), eq(orders.status, 'CONFIRMED')));
      order.status = 'IN_PRODUCTION';
    }
  }

  /** Starts the next stage of the same item, unless it is PRINTING with no payment yet. */
  private async startNext(
    tx: Database,
    job: LockedJob,
    order: LockedOrder,
    userId: string | null | undefined,
  ): Promise<NextJobState | undefined> {
    const [next] = await tx
      .select({
        id: productionJobs.id,
        orderId: productionJobs.orderId,
        orderItemId: productionJobs.orderItemId,
        stage: productionJobs.stage,
        sequence: productionJobs.sequence,
        status: productionJobs.status,
      })
      .from(productionJobs)
      .where(and(eq(productionJobs.orderItemId, job.orderItemId), eq(productionJobs.sequence, job.sequence + 1)))
      .for('update');
    if (!next) return undefined;
    if (next.status !== 'PENDING') return { id: next.id, stage: next.stage, status: next.status };

    if (next.stage === 'PRINTING' && !(await this.hasPayment(tx, next.orderId))) {
      return { id: next.id, stage: next.stage, status: 'PENDING', waitingFor: 'DOWN_PAYMENT' };
    }

    await this.startLocked(tx, next, order, { userId });
    return { id: next.id, stage: next.stage, status: 'IN_PROGRESS' };
  }

  /** READY + actual costs once no job of the order is PENDING or IN_PROGRESS. */
  private async finishOrderIfDone(tx: Database, order: LockedOrder): Promise<OrderStatus> {
    if (order.status !== 'IN_PRODUCTION') return order.status;

    const open = await tx.$count(
      productionJobs,
      and(eq(productionJobs.orderId, order.id), inArray(productionJobs.status, ['PENDING', 'IN_PROGRESS'])),
    );
    if (open > 0) return order.status;

    const costs = await this.costing.computeActualCosts(order.id, order.electricityRatePerKwh, tx);
    await tx
      .update(orders)
      .set({
        status: 'READY',
        actualMaterialCost: costs.materialCost.toFixed(2),
        actualElectricityCost: costs.electricityCost.toFixed(2),
        actualLaborCost: costs.laborCost.toFixed(2),
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, 'IN_PRODUCTION')));
    order.status = 'READY';
    return order.status;
  }

  private async hasPayment(tx: Database, orderId: string): Promise<boolean> {
    const [row] = await tx.select({ id: payments.id }).from(payments).where(eq(payments.orderId, orderId)).limit(1);
    return Boolean(row);
  }
}
