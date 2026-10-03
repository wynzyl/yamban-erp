import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { JobStatus, ProductionStage, StartJobData } from '@yamban/shared';
import { PRODUCTION_STAGES } from '@yamban/shared';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import {
  customers,
  orderItems,
  orderItemSizes,
  orderRoster,
  orders,
  payments,
  productionJobs,
  products,
} from '../db/schema/index.js';

export interface RosterEntry {
  playerName: string;
  jerseyNumber: string | null;
  size: string;
}

export interface StageJobRow {
  id: string;
  orderItemId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  status: JobStatus;
  dueDate: string | null;
  hasPaidDownPayment: boolean;
  sizes: { size: string; quantity: number }[];
  roster: RosterEntry[];
}

export interface DashboardCounts {
  design: { pending: number; ready: number };
  printing: number;
  heatPress: number;
  sewing: number;
  ready: number;
}

@Injectable()
export class ProductionService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** List jobs for a specific production stage */
  async listByStage(stage: ProductionStage): Promise<StageJobRow[]> {
    // For PRINTING: only include jobs where DESIGN stage is COMPLETED
    // For other stages: include jobs where previous stage is COMPLETED or job itself is active
    let stageFilter;

    if (stage === 'PRINTING') {
      // Jobs for PRINTING where DESIGN is completed
      stageFilter = and(
        eq(productionJobs.stage, 'PRINTING'),
        sql`EXISTS (
          SELECT 1 FROM production_jobs pj2
          WHERE pj2.order_item_id = ${productionJobs.orderItemId}
          AND pj2.stage = 'DESIGN'
          AND pj2.status = 'COMPLETED'
        )`,
      );
    } else {
      // For other stages, show all jobs in that stage
      stageFilter = eq(productionJobs.stage, stage);
    }

    const rows = await this.db
      .select({
        id: productionJobs.id,
        orderItemId: productionJobs.orderItemId,
        orderId: productionJobs.orderId,
        orderNumber: orders.orderNumber,
        customerId: customers.id,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        productId: products.id,
        productName: products.name,
        quantity: productionJobs.plannedQuantity,
        status: productionJobs.status,
        dueDate: orders.dueDate,
      })
      .from(productionJobs)
      .innerJoin(orders, eq(orders.id, productionJobs.orderId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .innerJoin(orderItems, eq(orderItems.id, productionJobs.orderItemId))
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(stageFilter);

    // Get payment info and sizes for each job
    const result: StageJobRow[] = [];

    for (const row of rows) {
      // Check if order has any payments
      const [paymentCheck] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(payments)
        .where(eq(payments.orderId, row.orderId));

      // Get sizes for this order item
      const sizesData = await this.db
        .select({
          size: orderItemSizes.size,
          quantity: orderItemSizes.quantity,
        })
        .from(orderItemSizes)
        .where(eq(orderItemSizes.orderItemId, row.orderItemId));

      // Get roster for this order item
      const rosterData = await this.db
        .select({
          playerName: orderRoster.playerName,
          jerseyNumber: orderRoster.jerseyNumber,
          size: orderRoster.size,
        })
        .from(orderRoster)
        .where(eq(orderRoster.orderItemId, row.orderItemId));

      const customerName = [row.customerFirstName, row.customerLastName]
        .filter(Boolean)
        .join(' ');

      result.push({
        id: row.id,
        orderItemId: row.orderItemId,
        orderId: row.orderId,
        orderNumber: row.orderNumber,
        customerId: row.customerId,
        customerName,
        productId: row.productId,
        productName: row.productName,
        quantity: row.quantity,
        status: row.status,
        dueDate: row.dueDate,
        hasPaidDownPayment: (paymentCheck?.count ?? 0) > 0,
        sizes: sizesData.map((s) => ({ size: s.size, quantity: s.quantity })),
        roster: rosterData.map((r) => ({
          playerName: r.playerName,
          jerseyNumber: r.jerseyNumber,
          size: r.size,
        })),
      });
    }

    return result;
  }

  /** Get counts for the dashboard */
  async getDashboardCounts(): Promise<DashboardCounts> {
    // Design: count pending (not completed) and ready (completed)
    const designPending = await this.db.$count(
      productionJobs,
      and(eq(productionJobs.stage, 'DESIGN'), sql`${productionJobs.status} != 'COMPLETED'`),
    );
    const designReady = await this.db.$count(
      productionJobs,
      and(eq(productionJobs.stage, 'DESIGN'), eq(productionJobs.status, 'COMPLETED')),
    );

    // Printing: jobs where DESIGN is completed and PRINTING is not completed
    const printing = await this.db.$count(
      productionJobs,
      and(
        eq(productionJobs.stage, 'PRINTING'),
        sql`${productionJobs.status} != 'COMPLETED'`,
        sql`EXISTS (
          SELECT 1 FROM production_jobs pj2
          WHERE pj2.order_item_id = ${productionJobs.orderItemId}
          AND pj2.stage = 'DESIGN'
          AND pj2.status = 'COMPLETED'
        )`,
      ),
    );

    // Heat Press: jobs where PRINTING is completed and HEAT_PRESS is not completed
    const heatPress = await this.db.$count(
      productionJobs,
      and(
        eq(productionJobs.stage, 'HEAT_PRESS'),
        sql`${productionJobs.status} != 'COMPLETED'`,
        sql`EXISTS (
          SELECT 1 FROM production_jobs pj2
          WHERE pj2.order_item_id = ${productionJobs.orderItemId}
          AND pj2.stage = 'PRINTING'
          AND pj2.status = 'COMPLETED'
        )`,
      ),
    );

    // Sewing: jobs where HEAT_PRESS is completed and SEWING is not completed
    const sewing = await this.db.$count(
      productionJobs,
      and(
        eq(productionJobs.stage, 'SEWING'),
        sql`${productionJobs.status} != 'COMPLETED'`,
        sql`EXISTS (
          SELECT 1 FROM production_jobs pj2
          WHERE pj2.order_item_id = ${productionJobs.orderItemId}
          AND pj2.stage = 'HEAT_PRESS'
          AND pj2.status = 'COMPLETED'
        )`,
      ),
    );

    // Ready: PACKAGING stage completed
    const ready = await this.db.$count(
      productionJobs,
      and(eq(productionJobs.stage, 'PACKAGING'), eq(productionJobs.status, 'COMPLETED')),
    );

    return {
      design: { pending: designPending, ready: designReady },
      printing,
      heatPress,
      sewing,
      ready,
    };
  }

  /** Start a job (set to IN_PROGRESS) with payment check for printing */
  async startJob(jobId: string, data: StartJobData) {
    const [job] = await this.db
      .select({
        id: productionJobs.id,
        stage: productionJobs.stage,
        status: productionJobs.status,
        orderId: productionJobs.orderId,
      })
      .from(productionJobs)
      .where(eq(productionJobs.id, jobId))
      .limit(1);

    if (!job) throw new NotFoundException('Job not found.');
    if (job.status !== 'PENDING') {
      throw new BadRequestException('Job is not in pending status.');
    }

    // For PRINTING stage, check payment
    if (job.stage === 'PRINTING') {
      const [paymentCheck] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(payments)
        .where(eq(payments.orderId, job.orderId));

      const hasPayment = (paymentCheck?.count ?? 0) > 0;

      if (!hasPayment && !data.acknowledgeNoPayment) {
        throw new BadRequestException(
          JSON.stringify({ requiresAcknowledgement: true, message: 'No down payment recorded.' }),
        );
      }
    }

    // Update job to IN_PROGRESS
    await this.db
      .update(productionJobs)
      .set({
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      })
      .where(eq(productionJobs.id, jobId));

    return { success: true };
  }

  /** Complete a job and start the next stage if applicable */
  async completeJob(jobId: string) {
    const [job] = await this.db
      .select({
        id: productionJobs.id,
        stage: productionJobs.stage,
        status: productionJobs.status,
        orderItemId: productionJobs.orderItemId,
      })
      .from(productionJobs)
      .where(eq(productionJobs.id, jobId))
      .limit(1);

    if (!job) throw new NotFoundException('Job not found.');

    // Idempotent: if already completed, return success
    if (job.status === 'COMPLETED') {
      return { success: true, alreadyCompleted: true };
    }

    // Mark current job as COMPLETED
    await this.db
      .update(productionJobs)
      .set({
        status: 'COMPLETED',
        completedAt: new Date(),
      })
      .where(eq(productionJobs.id, jobId));

    // Find and start next stage
    const currentStageIndex = PRODUCTION_STAGES.indexOf(job.stage);
    if (currentStageIndex < PRODUCTION_STAGES.length - 1) {
      const nextStage = PRODUCTION_STAGES[currentStageIndex + 1];

      // Update next stage job to IN_PROGRESS
      await this.db
        .update(productionJobs)
        .set({
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        })
        .where(
          and(
            eq(productionJobs.orderItemId, job.orderItemId),
            eq(productionJobs.stage, nextStage!),
            eq(productionJobs.status, 'PENDING'),
          ),
        );
    }

    return { success: true };
  }
}
