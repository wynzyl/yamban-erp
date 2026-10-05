import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { JobStatus, ProductionStage, StartJobData } from '@yamban/shared';
import { PRODUCTION_STAGES } from '@yamban/shared';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import {
  customers,
  designFiles,
  designJobs,
  orderItems,
  orderItemSizes,
  orderRoster,
  orders,
  payments,
  productionJobs,
  products,
} from '../db/schema/index.js';
import { InventoryService } from '../inventory/inventory.service.js';

export interface RosterEntry {
  playerName: string;
  jerseyNumber: string | null;
  size: string;
}

export interface DesignFileInfo {
  id: string;
  fileName: string;
  storageKey: string;
  isFinal: boolean;
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
  designFile: DesignFileInfo | null;
}

export interface DashboardCounts {
  design: { pending: number; ready: number };
  printing: number;
  heatPress: number;
  sewing: number;
  packaging: number;
  ready: number;
}

export interface ReadyOrderRow {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  totalQuantity: number;
  total: string;
  paid: string;
  balance: string;
  dueDate: string | null;
  completedAt: string | null;
}

@Injectable()
export class ProductionService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly inventoryService: InventoryService,
  ) {}

  /** List jobs for a specific production stage */
  async listByStage(stage: ProductionStage): Promise<StageJobRow[]> {
    // Only include jobs where:
    // 1. The previous stage is COMPLETED (job is ready to work on)
    // 2. The current stage is NOT COMPLETED (job hasn't moved on yet)
    let stageFilter;

    const stageIndex = PRODUCTION_STAGES.indexOf(stage);
    const previousStage = stageIndex > 0 ? PRODUCTION_STAGES[stageIndex - 1] : null;

    if (previousStage) {
      // Jobs for this stage where previous stage is completed and current is not completed
      stageFilter = and(
        eq(productionJobs.stage, stage),
        sql`${productionJobs.status} != 'COMPLETED'`,
        sql`EXISTS (
          SELECT 1 FROM production_jobs pj2
          WHERE pj2.order_item_id = ${productionJobs.orderItemId}
          AND pj2.stage = ${previousStage}
          AND pj2.status = 'COMPLETED'
        )`,
      );
    } else {
      // DESIGN stage has no previous stage, but still exclude completed
      stageFilter = and(
        eq(productionJobs.stage, stage),
        sql`${productionJobs.status} != 'COMPLETED'`,
      );
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

      // Get final design file for this order item (via design job)
      let designFile: DesignFileInfo | null = null;
      const [designFileData] = await this.db
        .select({
          id: designFiles.id,
          fileName: designFiles.fileName,
          storageKey: designFiles.storageKey,
          isFinal: designFiles.isFinal,
        })
        .from(designFiles)
        .innerJoin(designJobs, eq(designJobs.id, designFiles.designJobId))
        .innerJoin(productionJobs, eq(productionJobs.id, designJobs.productionJobId))
        .where(
          and(
            eq(productionJobs.orderItemId, row.orderItemId),
            eq(designFiles.isFinal, true),
          ),
        )
        .limit(1);

      if (designFileData) {
        designFile = {
          id: designFileData.id,
          fileName: designFileData.fileName,
          storageKey: designFileData.storageKey,
          isFinal: designFileData.isFinal,
        };
      }

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
        designFile,
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

    // Packaging: jobs where SEWING is completed and PACKAGING is not completed
    const packaging = await this.db.$count(
      productionJobs,
      and(
        eq(productionJobs.stage, 'PACKAGING'),
        sql`${productionJobs.status} != 'COMPLETED'`,
        sql`EXISTS (
          SELECT 1 FROM production_jobs pj2
          WHERE pj2.order_item_id = ${productionJobs.orderItemId}
          AND pj2.stage = 'SEWING'
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
      packaging,
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

    // Consume materials for this stage
    const [jobWithItem] = await this.db
      .select({ orderItemId: productionJobs.orderItemId })
      .from(productionJobs)
      .where(eq(productionJobs.id, jobId))
      .limit(1);

    if (jobWithItem) {
      await this.inventoryService.consumeMaterialsForStage(
        jobWithItem.orderItemId,
        job.stage,
      );
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
        orderId: productionJobs.orderId,
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

    // If PACKAGING (last stage) completed, check if all items are packaged
    // and update order status to READY
    if (job.stage === 'PACKAGING') {
      // Count total PACKAGING jobs for this order
      const [totalCount] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(productionJobs)
        .where(
          and(
            eq(productionJobs.orderId, job.orderId),
            eq(productionJobs.stage, 'PACKAGING'),
          ),
        );

      // Count completed PACKAGING jobs for this order
      const [completedCount] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(productionJobs)
        .where(
          and(
            eq(productionJobs.orderId, job.orderId),
            eq(productionJobs.stage, 'PACKAGING'),
            eq(productionJobs.status, 'COMPLETED'),
          ),
        );

      // If all packaging jobs are completed, update order status to READY
      if (totalCount?.count === completedCount?.count) {
        await this.db
          .update(orders)
          .set({ status: 'READY' })
          .where(
            and(
              eq(orders.id, job.orderId),
              eq(orders.status, 'IN_PRODUCTION'),
            ),
          );
      }
    }

    return { success: true };
  }

  /** List orders ready for pickup (all PACKAGING jobs completed, not yet released) */
  async listReadyOrders(): Promise<ReadyOrderRow[]> {
    // Get orders where all PACKAGING jobs are COMPLETED and order is not RELEASED/CANCELLED
    // This includes both READY status and IN_PRODUCTION (for backwards compatibility)
    const rows = await this.db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: customers.id,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        total: orders.total,
        dueDate: orders.dueDate,
        status: orders.status,
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(
        and(
          sql`${orders.status} NOT IN ('RELEASED', 'CANCELLED', 'QUOTATION')`,
          // All PACKAGING jobs for this order must be COMPLETED
          sql`NOT EXISTS (
            SELECT 1 FROM production_jobs pj
            WHERE pj.order_id = ${orders.id}
            AND pj.stage = 'PACKAGING'
            AND pj.status != 'COMPLETED'
          )`,
          // Must have at least one PACKAGING job (confirmed orders)
          sql`EXISTS (
            SELECT 1 FROM production_jobs pj
            WHERE pj.order_id = ${orders.id}
            AND pj.stage = 'PACKAGING'
          )`,
        ),
      );

    const result: ReadyOrderRow[] = [];

    for (const row of rows) {
      // Get total quantity for this order
      const [qtyResult] = await this.db
        .select({ total: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)` })
        .from(orderItems)
        .where(eq(orderItems.orderId, row.id));

      // Get the latest packaging completion time
      const [completionResult] = await this.db
        .select({ completedAt: sql<string>`MAX(${productionJobs.completedAt})` })
        .from(productionJobs)
        .where(
          and(
            eq(productionJobs.orderId, row.id),
            eq(productionJobs.stage, 'PACKAGING'),
            eq(productionJobs.status, 'COMPLETED'),
          ),
        );

      // Calculate total paid
      const [paidResult] = await this.db
        .select({ paid: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
        .from(payments)
        .where(eq(payments.orderId, row.id));

      const totalNum = parseFloat(row.total);
      const paidNum = parseFloat(paidResult?.paid ?? '0');
      const balanceNum = totalNum - paidNum;

      const customerName = [row.customerFirstName, row.customerLastName]
        .filter(Boolean)
        .join(' ');

      result.push({
        id: row.id,
        orderNumber: row.orderNumber,
        customerId: row.customerId,
        customerName,
        totalQuantity: Number(qtyResult?.total ?? 0),
        total: row.total,
        paid: paidNum.toFixed(2),
        balance: balanceNum.toFixed(2),
        dueDate: row.dueDate,
        completedAt: completionResult?.completedAt ?? null,
      });
    }

    return result;
  }

  /** Mark an order as delivered (released) */
  async releaseOrder(orderId: string) {
    const [order] = await this.db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) throw new NotFoundException('Order not found.');

    // Allow release from READY, IN_PRODUCTION, or CONFIRMED (if all packaging is done)
    const releasableStatuses = ['READY', 'IN_PRODUCTION', 'CONFIRMED'];
    if (!releasableStatuses.includes(order.status)) {
      throw new BadRequestException('Order cannot be released from current status.');
    }

    // Verify all packaging jobs are completed
    const [incompletePackaging] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(productionJobs)
      .where(
        and(
          eq(productionJobs.orderId, orderId),
          eq(productionJobs.stage, 'PACKAGING'),
          sql`${productionJobs.status} != 'COMPLETED'`,
        ),
      );

    if ((incompletePackaging?.count ?? 0) > 0) {
      throw new BadRequestException('All items must be packaged before releasing.');
    }

    await this.db
      .update(orders)
      .set({ status: 'RELEASED' })
      .where(eq(orders.id, orderId));

    return { success: true };
  }
}
