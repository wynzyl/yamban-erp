import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AddOrderItemData,
  CreateOrderData,
  EditOrderData,
  EditPermissions,
  GarmentSize,
  ListQuery,
  OrderStatus,
  Paginated,
  UpdateItemPricesData,
  UpdateOrderData,
  UpdateOrderNotesData,
  UpdateRosterData,
  UserRole,
} from '@yamban/shared';
import { PRODUCTION_STAGES } from '@yamban/shared';
import { and, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from 'drizzle-orm';
import { escapeLikeTerm, parseDecimal, toFixedDecimal } from '../common/utils/index.js';
import { CostingService } from '../costing/costing.service.js';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import {
  customers,
  designJobs,
  electricityRates,
  machines,
  materials,
  orderItemLabor,
  orderItemProcesses,
  orderItems,
  orderItemSizes,
  orderMaterials,
  orderRoster,
  orders,
  organizations,
  payments,
  productionJobs,
  productRecipes,
  products,
  productSizeProcesses,
  recipeMaterials,
} from '../db/schema/index.js';

export interface OrderListRow {
  id: string;
  orderNumber: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  organizationName: string | null;
  orderDate: string;
  dueDate: string | null;
  status: string;
  /** Current production stage (earliest incomplete stage), null if not in production */
  productionStage: string | null;
  total: string;
  paidAmount: string;
  itemCount: number;
  /** Days overdue if released/past due date with balance */
  daysOverdue?: number;
  // Cost fields for Owner only
  totalProductionCost?: string;
}

export interface OrderDetailRow {
  id: string;
  orderNumber: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  customerMobile: string | null;
  organizationId: string | null;
  organizationName: string | null;
  orderDate: string;
  dueDate: string | null;
  status: string;
  materialStatus: string;
  subtotal: string;
  discount: string;
  total: string;
  notes: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderCostBreakdown {
  estimated: {
    materialCost: string;
    electricityCost: string;
    laborCost: string;
    total: string;
  };
  actual: {
    materialCost: string | null;
    electricityCost: string | null;
    laborCost: string | null;
    total: string | null;
  } | null;
  variance: {
    materialCost: string | null;
    electricityCost: string | null;
    laborCost: string | null;
    total: string | null;
  } | null;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly costingService: CostingService,
  ) {}

  /**
   * Creates all order snapshots when confirming an order:
   * - Material snapshots from recipes
   * - Machine process snapshots
   * - Production jobs for all stages
   * - Computes and stores estimated costs
   *
   * Must be called within a transaction.
   */
  private async createOrderSnapshots(
    tx: Database,
    orderId: string,
    electricityRatePerKwh: string | null,
  ): Promise<{ hasShortage: boolean }> {
    // Fetch all order items
    const items = await tx
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    let hasShortage = false;

    // Collect all inserts for batch operations
    const materialInserts: (typeof orderMaterials.$inferInsert)[] = [];
    const processInserts: (typeof orderItemProcesses.$inferInsert)[] = [];

    // Create material snapshots and production jobs for each item
    for (const item of items) {
      // Get sizes for this item
      const sizes = await tx
        .select({ size: orderItemSizes.size, quantity: orderItemSizes.quantity })
        .from(orderItemSizes)
        .where(eq(orderItemSizes.orderItemId, item.id));

      // Look up the recipe for this product
      const [recipe] = await tx
        .select({ id: productRecipes.id })
        .from(productRecipes)
        .where(eq(productRecipes.productId, item.productId))
        .limit(1);

      if (recipe) {
        // Get recipe materials
        const recipeMatRows = await tx
          .select({
            materialId: recipeMaterials.materialId,
            quantityPerPiece: recipeMaterials.quantityPerPiece,
            stage: recipeMaterials.stage,
            unit: materials.unit,
            averageUnitCost: materials.averageUnitCost,
            stockOnHand: materials.stockOnHand,
          })
          .from(recipeMaterials)
          .innerJoin(materials, eq(materials.id, recipeMaterials.materialId))
          .where(eq(recipeMaterials.recipeId, recipe.id));

        // Collect materials for each size (batch insert later)
        for (const sizeRow of sizes) {
          for (const mat of recipeMatRows) {
            const qtyPerPiece = parseDecimal(mat.quantityPerPiece);
            const totalQty = qtyPerPiece * sizeRow.quantity;
            const unitCost = parseDecimal(mat.averageUnitCost);
            const totalCost = totalQty * unitCost;

            materialInserts.push({
              orderItemId: item.id,
              materialId: mat.materialId,
              size: sizeRow.size,
              quantityPerPiece: mat.quantityPerPiece,
              totalQuantity: totalQty.toFixed(3),
              unit: mat.unit,
              unitCost: mat.averageUnitCost,
              totalCost: totalCost.toFixed(2),
              stage: mat.stage,
            });

            // Check if this material will create a shortage
            if (parseDecimal(mat.stockOnHand) < totalQty) {
              hasShortage = true;
            }
          }
        }
      }

      // Copy machine processes for this product
      const processes = await tx
        .select({
          machineId: productSizeProcesses.machineId,
          minutesPerPiece: productSizeProcesses.minutesPerPiece,
          powerKw: machines.powerKw,
        })
        .from(productSizeProcesses)
        .innerJoin(machines, eq(machines.id, productSizeProcesses.machineId))
        .where(eq(productSizeProcesses.productId, item.productId));

      // Collect orderItemProcesses for each size (batch insert later)
      for (const sizeRow of sizes) {
        for (const proc of processes) {
          processInserts.push({
            orderItemId: item.id,
            size: sizeRow.size,
            machineId: proc.machineId,
            powerKw: proc.powerKw,
            minutesPerPiece: proc.minutesPerPiece,
            quantity: sizeRow.quantity,
          });
        }
      }

      // Create production jobs for each stage using helper
      await this.createProductionJobsForItem(tx, orderId, item.id, item.quantity);
    }

    // Batch insert all materials
    if (materialInserts.length > 0) {
      await tx.insert(orderMaterials).values(materialInserts);
    }

    // Batch insert all processes
    if (processInserts.length > 0) {
      await tx.insert(orderItemProcesses).values(processInserts);
    }

    // Update material status if there's a shortage
    if (hasShortage) {
      await tx
        .update(orders)
        .set({ materialStatus: 'SHORT' })
        .where(eq(orders.id, orderId));
    }

    // Compute estimated costs and create labor lines
    const { costs, laborLines } = await this.costingService.computeEstimatedCosts(
      orderId,
      electricityRatePerKwh,
      tx,
    );

    // Insert orderItemLabor rows
    if (laborLines.length > 0) {
      await tx.insert(orderItemLabor).values(laborLines);
    }

    // Update order with estimated costs
    await tx
      .update(orders)
      .set({
        estimatedMaterialCost: costs.materialCost.toFixed(2),
        estimatedElectricityCost: costs.electricityCost.toFixed(2),
        estimatedLaborCost: costs.laborCost.toFixed(2),
      })
      .where(eq(orders.id, orderId));

    return { hasShortage };
  }

  /**
   * Recalculates order subtotal and total based on current item subtotals and discount.
   * Must be called within a transaction.
   */
  private async recalculateOrderTotals(
    tx: Database,
    orderId: string,
  ): Promise<{ subtotal: string; total: string }> {
    const allItems = await tx
      .select({ subtotal: orderItems.subtotal })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const orderSubtotal = allItems.reduce((sum, i) => sum + parseDecimal(i.subtotal), 0);

    const [order] = await tx
      .select({ discount: orders.discount })
      .from(orders)
      .where(eq(orders.id, orderId));

    const discount = parseDecimal(order?.discount);
    const orderTotal = Math.max(0, orderSubtotal - discount);

    await tx
      .update(orders)
      .set({
        subtotal: orderSubtotal.toFixed(2),
        total: orderTotal.toFixed(2),
      })
      .where(eq(orders.id, orderId));

    return { subtotal: orderSubtotal.toFixed(2), total: orderTotal.toFixed(2) };
  }

  /**
   * Creates production jobs for all stages for an order item.
   * Must be called within a transaction.
   */
  private async createProductionJobsForItem(
    tx: Database,
    orderId: string,
    itemId: string,
    quantity: number,
  ): Promise<void> {
    for (const [i, stage] of PRODUCTION_STAGES.entries()) {
      const [job] = await tx
        .insert(productionJobs)
        .values({
          orderId,
          orderItemId: itemId,
          stage,
          sequence: i + 1,
          plannedQuantity: quantity,
        })
        .returning();

      if (stage === 'DESIGN' && job) {
        await tx.insert(designJobs).values({
          productionJobId: job.id,
        });
      }
    }
  }

  /**
   * Inserts a new order item with sizes and optional roster.
   * Returns the new item ID.
   * Must be called within a transaction.
   */
  private async insertOrderItem(
    tx: Database,
    orderId: string,
    itemData: {
      productId: string;
      description?: string | null;
      sizes: { size: GarmentSize; quantity: number; unitPrice: string }[];
      roster?: { playerName: string; jerseyNumber?: string | null; size: GarmentSize; shortSize?: GarmentSize | null }[];
    },
  ): Promise<string> {
    // Calculate item totals
    let itemQty = 0;
    let itemSubtotal = 0;
    for (const size of itemData.sizes) {
      itemQty += size.quantity;
      itemSubtotal += parseDecimal(size.unitPrice) * size.quantity;
    }

    // Insert order item
    const [item] = await tx
      .insert(orderItems)
      .values({
        orderId,
        productId: itemData.productId,
        description: itemData.description,
        quantity: itemQty,
        subtotal: itemSubtotal.toFixed(2),
      })
      .returning();

    // Batch insert sizes
    const sizeInserts = itemData.sizes.map((s) => ({
      orderItemId: item!.id,
      size: s.size,
      quantity: s.quantity,
      unitPrice: s.unitPrice,
      subtotal: (parseDecimal(s.unitPrice) * s.quantity).toFixed(2),
    }));
    await tx.insert(orderItemSizes).values(sizeInserts);

    // Batch insert roster
    if (itemData.roster && itemData.roster.length > 0) {
      const rosterInserts = itemData.roster.map((r) => ({
        orderItemId: item!.id,
        playerName: r.playerName,
        jerseyNumber: r.jerseyNumber || null,
        size: r.size,
        shortSize: r.shortSize || null,
      }));
      await tx.insert(orderRoster).values(rosterInserts);
    }

    return item!.id;
  }

  async list(q: ListQuery & { status?: string; payment?: string }, role?: UserRole): Promise<Paginated<OrderListRow>> {
    const conditions: SQL[] = [];

    if (q.search) {
      const term = escapeLikeTerm(q.search);
      conditions.push(
        or(
          ilike(orders.orderNumber, term),
          ilike(customers.firstName, term),
          ilike(customers.lastName, term),
          ilike(organizations.name, term),
        )!,
      );
    }

    if (q.status) {
      if (q.status === 'CONFIRMED') {
        // Confirmed = orders confirmed but no production started (all jobs still PENDING)
        // Use NOT EXISTS to find orders where no job has started
        conditions.push(
          and(
            eq(orders.status, 'CONFIRMED'),
            sql`NOT EXISTS (
              SELECT 1 FROM ${productionJobs} pj
              WHERE pj.order_id = ${orders.id}
              AND pj.status != 'PENDING'
            )`,
          )!,
        );
      } else if (q.status === 'IN_PRODUCTION') {
        // In Production = orders where at least one job in Design/Printing/Heat Press/Sewing
        // has started (IN_PROGRESS) or the current stage is one of these
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${productionJobs} pj
            WHERE pj.order_id = ${orders.id}
            AND pj.stage IN ('DESIGN', 'PRINTING', 'HEAT_PRESS', 'SEWING')
            AND pj.status = 'IN_PROGRESS'
          )`,
        );
      } else {
        conditions.push(eq(orders.status, q.status as OrderStatus));
      }
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const isOwner = role === 'OWNER';

    // Subquery for paid amount
    const paidSubquery = this.db
      .select({
        orderId: payments.orderId,
        total: sql<string>`coalesce(sum(${payments.amount}), '0')`.as('paid_total'),
      })
      .from(payments)
      .groupBy(payments.orderId)
      .as('paid');

    // Subquery for item count
    const itemCountSubquery = this.db
      .select({
        orderId: orderItems.orderId,
        count: sql<number>`count(*)::int`.as('item_count'),
      })
      .from(orderItems)
      .groupBy(orderItems.orderId)
      .as('items');

    // Subquery for current production stage (earliest incomplete stage)
    // A stage is complete when all its jobs are COMPLETED
    const stageSubquery = this.db
      .select({
        orderId: productionJobs.orderId,
        currentStage: sql<string>`
          (SELECT pj.stage FROM ${productionJobs} pj
           WHERE pj.order_id = ${productionJobs.orderId}
             AND pj.status != 'COMPLETED'
           ORDER BY pj.sequence ASC
           LIMIT 1)
        `.as('current_stage'),
      })
      .from(productionJobs)
      .groupBy(productionJobs.orderId)
      .as('stage');

    const [rows, total] = await Promise.all([
      this.db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          customerId: orders.customerId,
          customerFirstName: customers.firstName,
          customerLastName: customers.lastName,
          organizationName: organizations.name,
          orderDate: orders.orderDate,
          dueDate: orders.dueDate,
          status: orders.status,
          total: orders.total,
          paidAmount: sql<string>`coalesce(${paidSubquery.total}, '0')`,
          itemCount: sql<number>`coalesce(${itemCountSubquery.count}, 0)`,
          productionStage: stageSubquery.currentStage,
          // Cost fields for Owner
          estimatedMaterialCost: orders.estimatedMaterialCost,
          estimatedElectricityCost: orders.estimatedElectricityCost,
          estimatedLaborCost: orders.estimatedLaborCost,
        })
        .from(orders)
        .innerJoin(customers, eq(customers.id, orders.customerId))
        .leftJoin(organizations, eq(organizations.id, orders.organizationId))
        .leftJoin(paidSubquery, eq(paidSubquery.orderId, orders.id))
        .leftJoin(itemCountSubquery, eq(itemCountSubquery.orderId, orders.id))
        .leftJoin(stageSubquery, eq(stageSubquery.orderId, orders.id))
        .where(where)
        .orderBy(desc(orders.orderDate), desc(orders.createdAt))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      this.db.$count(
        this.db
          .select({ id: orders.id })
          .from(orders)
          .innerJoin(customers, eq(customers.id, orders.customerId))
          .leftJoin(organizations, eq(organizations.id, orders.organizationId))
          .where(where)
          .as('o'),
      ),
    ]);

    // Transform rows, adding cost data and calculating overdue days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items: OrderListRow[] = rows.map((row) => {
      const totalAmount = parseDecimal(row.total);
      const paidAmount = parseDecimal(row.paidAmount);
      const balance = totalAmount - paidAmount;

      // Calculate days overdue if released/past due with balance
      let daysOverdue: number | undefined;
      if (balance > 0 && row.dueDate) {
        const dueDate = new Date(row.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        if (today > dueDate) {
          daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      const base: OrderListRow = {
        id: row.id,
        orderNumber: row.orderNumber,
        customerId: row.customerId,
        customerFirstName: row.customerFirstName,
        customerLastName: row.customerLastName,
        organizationName: row.organizationName,
        orderDate: row.orderDate,
        dueDate: row.dueDate,
        status: row.status,
        productionStage: row.productionStage ?? null,
        total: row.total,
        paidAmount: row.paidAmount,
        itemCount: row.itemCount,
        daysOverdue,
      };

      // Add cost data for Owner
      if (isOwner && row.estimatedMaterialCost != null) {
        const matCost = parseDecimal(row.estimatedMaterialCost);
        const elecCost = parseDecimal(row.estimatedElectricityCost);
        const laborCost = parseDecimal(row.estimatedLaborCost);
        base.totalProductionCost = toFixedDecimal(matCost + elecCost + laborCost, 2);
      }

      return base;
    });

    // Filter by payment tier if requested
    let filteredItems = items;
    if (q.payment) {
      filteredItems = items.filter((item) => {
        const totalAmount = parseDecimal(item.total);
        const paidAmount = parseDecimal(item.paidAmount);
        const balance = totalAmount - paidAmount;

        switch (q.payment) {
          case 'unpaid':
            return paidAmount === 0 && balance > 0;
          case 'balance':
            return paidAmount > 0 && balance > 0 && !item.daysOverdue;
          case 'paid':
            return balance <= 0;
          case 'overdue':
            return (item.daysOverdue ?? 0) > 0;
          default:
            return true;
        }
      });
    }

    return { items: filteredItems, page: q.page, pageSize: q.pageSize, total: q.payment ? filteredItems.length : total };
  }

  async get(id: string, role?: UserRole): Promise<OrderDetailRow & { items: OrderItemDetail[]; payments: PaymentRow[]; productionJobs: ProductionJobRow[]; costBreakdown?: OrderCostBreakdown }> {
    const isOwner = role === 'OWNER';

    const [order] = await this.db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerMobile: customers.mobile,
        organizationId: orders.organizationId,
        organizationName: organizations.name,
        orderDate: orders.orderDate,
        dueDate: orders.dueDate,
        status: orders.status,
        materialStatus: orders.materialStatus,
        subtotal: orders.subtotal,
        discount: orders.discount,
        total: orders.total,
        notes: orders.notes,
        confirmedAt: orders.confirmedAt,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        // Cost columns
        estimatedMaterialCost: orders.estimatedMaterialCost,
        estimatedElectricityCost: orders.estimatedElectricityCost,
        estimatedLaborCost: orders.estimatedLaborCost,
        actualMaterialCost: orders.actualMaterialCost,
        actualElectricityCost: orders.actualElectricityCost,
        actualLaborCost: orders.actualLaborCost,
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(organizations, eq(organizations.id, orders.organizationId))
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) throw new NotFoundException('Order not found.');

    // Get items with their sizes
    const itemsRaw = await this.db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        productName: products.name,
        description: orderItems.description,
        quantity: orderItems.quantity,
        subtotal: orderItems.subtotal,
      })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(eq(orderItems.orderId, id))
      .orderBy(asc(orderItems.id));

    const itemIds = itemsRaw.map((i) => i.id);
    const sizesRaw =
      itemIds.length > 0
        ? await this.db
            .select()
            .from(orderItemSizes)
            .where(inArray(orderItemSizes.orderItemId, itemIds))
            .orderBy(asc(orderItemSizes.orderItemId))
        : [];

    const sizesByItem = new Map<string, typeof sizesRaw>();
    for (const s of sizesRaw) {
      const arr = sizesByItem.get(s.orderItemId) ?? [];
      arr.push(s);
      sizesByItem.set(s.orderItemId, arr);
    }

    // Get roster entries
    const rosterRaw =
      itemIds.length > 0
        ? await this.db
            .select()
            .from(orderRoster)
            .where(inArray(orderRoster.orderItemId, itemIds))
            .orderBy(asc(orderRoster.orderItemId))
        : [];

    const rosterByItem = new Map<string, typeof rosterRaw>();
    for (const r of rosterRaw) {
      const arr = rosterByItem.get(r.orderItemId) ?? [];
      arr.push(r);
      rosterByItem.set(r.orderItemId, arr);
    }

    const items: OrderItemDetail[] = itemsRaw.map((item) => ({
      ...item,
      sizes: sizesByItem.get(item.id) ?? [],
      roster: rosterByItem.get(item.id) ?? [],
    }));

    // Get payments
    const paymentsRaw = await this.db
      .select({
        id: payments.id,
        paymentDate: payments.paymentDate,
        amount: payments.amount,
        method: payments.method,
        reference: payments.reference,
        notes: payments.notes,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(eq(payments.orderId, id))
      .orderBy(desc(payments.paymentDate));

    // Get production jobs (if order is confirmed or beyond)
    const prodJobs: ProductionJobRow[] = [];
    if (order.status !== 'QUOTATION') {
      const jobsRaw = await this.db
        .select({
          id: productionJobs.id,
          orderItemId: productionJobs.orderItemId,
          stage: productionJobs.stage,
          sequence: productionJobs.sequence,
          status: productionJobs.status,
          designJobId: designJobs.id,
          designApprovalStatus: designJobs.approvalStatus,
        })
        .from(productionJobs)
        .leftJoin(designJobs, eq(designJobs.productionJobId, productionJobs.id))
        .where(eq(productionJobs.orderId, id))
        .orderBy(asc(productionJobs.orderItemId), asc(productionJobs.sequence));

      prodJobs.push(...jobsRaw);
    }

    // Build the base response
    const baseOrder: OrderDetailRow = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerFirstName: order.customerFirstName,
      customerLastName: order.customerLastName,
      customerMobile: order.customerMobile,
      organizationId: order.organizationId,
      organizationName: order.organizationName,
      orderDate: order.orderDate,
      dueDate: order.dueDate,
      status: order.status,
      materialStatus: order.materialStatus,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      notes: order.notes,
      confirmedAt: order.confirmedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    // Build cost breakdown for Owner
    let costBreakdown: OrderCostBreakdown | undefined;
    if (isOwner && order.estimatedMaterialCost != null) {
      const estMat = parseDecimal(order.estimatedMaterialCost);
      const estElec = parseDecimal(order.estimatedElectricityCost);
      const estLabor = parseDecimal(order.estimatedLaborCost);
      const estTotal = estMat + estElec + estLabor;

      costBreakdown = {
        estimated: {
          materialCost: order.estimatedMaterialCost ?? '0.00',
          electricityCost: order.estimatedElectricityCost ?? '0.00',
          laborCost: order.estimatedLaborCost ?? '0.00',
          total: toFixedDecimal(estTotal, 2),
        },
        actual: null,
        variance: null,
      };

      // Add actual costs if available (order is READY or later)
      if (order.actualMaterialCost != null) {
        const actMat = parseDecimal(order.actualMaterialCost);
        const actElec = parseDecimal(order.actualElectricityCost);
        const actLabor = parseDecimal(order.actualLaborCost);
        const actTotal = actMat + actElec + actLabor;

        costBreakdown.actual = {
          materialCost: order.actualMaterialCost,
          electricityCost: order.actualElectricityCost,
          laborCost: order.actualLaborCost,
          total: toFixedDecimal(actTotal, 2),
        };

        // Calculate variance (actual - estimated)
        costBreakdown.variance = {
          materialCost: toFixedDecimal(actMat - estMat, 2),
          electricityCost: toFixedDecimal(actElec - estElec, 2),
          laborCost: toFixedDecimal(actLabor - estLabor, 2),
          total: toFixedDecimal(actTotal - estTotal, 2),
        };
      }
    }

    return {
      ...baseOrder,
      items,
      payments: paymentsRaw,
      productionJobs: prodJobs,
      ...(costBreakdown && { costBreakdown }),
    };
  }

  async create(data: CreateOrderData, userId: string) {
    // Generate order number: YMB-YYMMDD-XXX
    const today = new Date();
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
    const prefix = `YMB-${dateStr}-`;

    // Get next sequence for today
    const [lastOrder] = await this.db
      .select({ orderNumber: orders.orderNumber })
      .from(orders)
      .where(ilike(orders.orderNumber, `${prefix}%`))
      .orderBy(desc(orders.orderNumber))
      .limit(1);

    let seq = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.orderNumber.slice(-3), 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const orderNumber = `${prefix}${seq.toString().padStart(3, '0')}`;

    // Calculate totals
    let subtotal = 0;
    for (const item of data.items) {
      for (const size of item.sizes) {
        subtotal += parseDecimal(size.unitPrice) * size.quantity;
      }
    }
    const discount = parseDecimal(data.discount);
    const total = Math.max(0, subtotal - discount);

    return await this.db.transaction(async (tx) => {
      // Insert order
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          customerId: data.customerId,
          organizationId: data.organizationId,
          dueDate: data.dueDate,
          subtotal: subtotal.toFixed(2),
          discount: discount.toFixed(2),
          total: total.toFixed(2),
          notes: data.notes,
          createdById: userId,
        })
        .returning();

      // Insert items using helper
      for (const itemData of data.items) {
        await this.insertOrderItem(tx, order!.id, {
          productId: itemData.productId,
          description: itemData.description,
          sizes: itemData.sizes,
          roster: itemData.roster,
        });
      }

      return order!;
    });
  }

  async update(id: string, data: UpdateOrderData) {
    const [existing] = await this.db.select({ status: orders.status }).from(orders).where(eq(orders.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Order not found.');

    // Validate status transitions
    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        QUOTATION: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['IN_PRODUCTION', 'CANCELLED'],
        IN_PRODUCTION: ['READY', 'CANCELLED'],
        READY: ['RELEASED', 'IN_PRODUCTION'],
        RELEASED: [],
        CANCELLED: [],
      };
      if (!validTransitions[existing.status]?.includes(data.status)) {
        throw new BadRequestException(`Cannot change status from ${existing.status} to ${data.status}.`);
      }
    }

    const updates: Partial<typeof orders.$inferInsert> = {};
    if (data.dueDate !== undefined) updates.dueDate = data.dueDate;
    if (data.discount !== undefined) {
      updates.discount = data.discount;
      // Recalculate total
      const [order] = await this.db.select({ subtotal: orders.subtotal }).from(orders).where(eq(orders.id, id));
      if (order) {
        const total = Math.max(0, parseDecimal(order.subtotal) - parseDecimal(data.discount));
        updates.total = total.toFixed(2);
      }
    }
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.status !== undefined) {
      updates.status = data.status;
      if (data.status === 'CONFIRMED') {
        updates.confirmedAt = new Date();
      }
    }

    // When confirming, create production jobs and material snapshots in a transaction
    if (data.status === 'CONFIRMED' && existing.status === 'QUOTATION') {
      return await this.db.transaction(async (tx) => {
        // Get current electricity rate
        const [currentRate] = await tx
          .select({ ratePerKwh: electricityRates.ratePerKwh })
          .from(electricityRates)
          .orderBy(desc(electricityRates.effectiveDate))
          .limit(1);

        // Set electricity rate on order
        if (currentRate) {
          updates.electricityRatePerKwh = currentRate.ratePerKwh;
        }

        await tx.update(orders).set(updates).where(eq(orders.id, id));

        // Create all order snapshots (materials, processes, production jobs, costs)
        await this.createOrderSnapshots(tx, id, currentRate?.ratePerKwh ?? null);

        // Return the fully updated order
        const [finalOrder] = await tx.select().from(orders).where(eq(orders.id, id));
        return finalOrder!;
      });
    }

    const [updated] = await this.db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return updated!;
  }

  /** Check if an order is editable (not past DESIGN stage in production) */
  async isEditable(id: string): Promise<boolean> {
    const [order] = await this.db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) return false;

    // Quotations are always editable
    if (order.status === 'QUOTATION') return true;

    // Check if any production job has reached PRINTING or beyond
    const [printingOrBeyond] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(productionJobs)
      .where(
        and(
          eq(productionJobs.orderId, id),
          inArray(productionJobs.stage, ['PRINTING', 'HEAT_PRESS', 'SEWING', 'PACKAGING']),
          ne(productionJobs.status, 'PENDING'), // Started jobs
        ),
      );

    return (printingOrBeyond?.count ?? 0) === 0;
  }

  /** Get graduated edit permissions for an order */
  async getEditPermissions(id: string): Promise<EditPermissions> {
    const [order] = await this.db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return { canFullEdit: false, canEditRoster: false, canAddItems: false, canEditPrices: false };
    }

    // Quotations have full edit access
    if (order.status === 'QUOTATION') {
      return { canFullEdit: true, canEditRoster: true, canAddItems: true, canEditPrices: true };
    }

    // Released or cancelled orders cannot be edited
    if (order.status === 'RELEASED' || order.status === 'CANCELLED') {
      return { canFullEdit: false, canEditRoster: false, canAddItems: false, canEditPrices: false };
    }

    // Check if any production job has started PRINTING or beyond (blocks full edit)
    const [printingStarted] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(productionJobs)
      .where(
        and(
          eq(productionJobs.orderId, id),
          inArray(productionJobs.stage, ['PRINTING', 'HEAT_PRESS', 'SEWING', 'PACKAGING']),
          ne(productionJobs.status, 'PENDING'),
        ),
      );

    const canFullEdit = (printingStarted?.count ?? 0) === 0;
    // Item-level edits (roster, prices, sizes) are allowed until RELEASED
    // This gives flexibility for changes during production
    const canEditRoster = true;
    const canAddItems = true;
    const canEditPrices = true;

    return { canFullEdit, canEditRoster, canAddItems, canEditPrices };
  }

  /** Full order edit with items, sizes, and roster */
  async editOrder(id: string, data: EditOrderData) {
    const [existing] = await this.db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Order not found.');

    // Check if order is editable
    const editable = await this.isEditable(id);
    if (!editable) {
      throw new BadRequestException('Order cannot be edited once printing has started.');
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of data.items) {
      for (const size of item.sizes) {
        subtotal += parseDecimal(size.unitPrice) * size.quantity;
      }
    }
    const discount = parseDecimal(data.discount);
    const total = Math.max(0, subtotal - discount);

    return await this.db.transaction(async (tx) => {
      // Update order header
      await tx
        .update(orders)
        .set({
          dueDate: data.dueDate,
          discount: discount.toFixed(2),
          subtotal: subtotal.toFixed(2),
          total: total.toFixed(2),
          notes: data.notes,
        })
        .where(eq(orders.id, id));

      // Get existing items to compare
      const existingItems = await tx
        .select({ id: orderItems.id })
        .from(orderItems)
        .where(eq(orderItems.orderId, id));

      const existingItemIds = new Set(existingItems.map((i) => i.id));
      const updatedItemIds = new Set<string>();

      // Upsert items
      for (const itemData of data.items) {
        if (itemData.id && existingItemIds.has(itemData.id)) {
          // Update existing item
          let itemQty = 0;
          let itemSubtotal = 0;
          for (const size of itemData.sizes) {
            itemQty += size.quantity;
            itemSubtotal += parseDecimal(size.unitPrice) * size.quantity;
          }

          await tx
            .update(orderItems)
            .set({
              description: itemData.description,
              quantity: itemQty,
              subtotal: itemSubtotal.toFixed(2),
            })
            .where(eq(orderItems.id, itemData.id));

          updatedItemIds.add(itemData.id);

          // Delete old sizes and roster for this item
          await tx.delete(orderItemSizes).where(eq(orderItemSizes.orderItemId, itemData.id));
          await tx.delete(orderRoster).where(eq(orderRoster.orderItemId, itemData.id));

          // Batch insert new sizes
          const sizeInserts = itemData.sizes.map((s) => ({
            orderItemId: itemData.id!,
            size: s.size,
            quantity: s.quantity,
            unitPrice: s.unitPrice,
            subtotal: (parseDecimal(s.unitPrice) * s.quantity).toFixed(2),
          }));
          await tx.insert(orderItemSizes).values(sizeInserts);

          // Batch insert roster entries
          if (itemData.roster && itemData.roster.length > 0) {
            const rosterInserts = itemData.roster.map((r) => ({
              orderItemId: itemData.id!,
              playerName: r.playerName,
              jerseyNumber: r.jerseyNumber || null,
              size: r.size,
              shortSize: r.shortSize || null,
            }));
            await tx.insert(orderRoster).values(rosterInserts);
          }
        } else {
          // Insert new item using helper
          await this.insertOrderItem(tx, id, {
            productId: itemData.productId,
            description: itemData.description,
            sizes: itemData.sizes,
            roster: itemData.roster,
          });
        }
      }

      // Delete items that were removed (only if QUOTATION - confirmed orders need special handling)
      if (existing.status === 'QUOTATION') {
        const itemsToDelete = [...existingItemIds].filter((id) => !updatedItemIds.has(id));
        if (itemsToDelete.length > 0) {
          await tx.delete(orderItems).where(inArray(orderItems.id, itemsToDelete));
        }
      }

      // Return updated order
      const [updated] = await tx.select().from(orders).where(eq(orders.id, id));
      return updated!;
    });
  }

  /** Update roster for a specific item */
  async editRoster(orderId: string, itemId: string, data: UpdateRosterData) {
    const permissions = await this.getEditPermissions(orderId);
    if (!permissions.canEditRoster) {
      throw new BadRequestException('Roster cannot be edited once packaging has started.');
    }

    // Verify item belongs to order
    const [item] = await this.db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
      .limit(1);

    if (!item) throw new NotFoundException('Order item not found.');

    return await this.db.transaction(async (tx) => {
      // Delete existing roster entries for this item
      await tx.delete(orderRoster).where(eq(orderRoster.orderItemId, itemId));

      // Batch insert new roster entries
      if (data.roster.length > 0) {
        const rosterInserts = data.roster.map((entry) => ({
          orderItemId: itemId,
          playerName: entry.playerName,
          jerseyNumber: entry.jerseyNumber || null,
          size: entry.size,
          shortSize: entry.shortSize || null,
        }));
        await tx.insert(orderRoster).values(rosterInserts);
      }

      // Return updated roster
      const roster = await tx
        .select()
        .from(orderRoster)
        .where(eq(orderRoster.orderItemId, itemId));

      return roster;
    });
  }

  /** Update sizes (description, quantities and prices) for a specific item */
  async updateItemPrices(orderId: string, itemId: string, data: UpdateItemPricesData) {
    const permissions = await this.getEditPermissions(orderId);
    if (!permissions.canEditPrices) {
      throw new BadRequestException('Item cannot be changed once order is released.');
    }

    // Verify item belongs to order
    const [item] = await this.db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
      .limit(1);

    if (!item) throw new NotFoundException('Order item not found.');

    return await this.db.transaction(async (tx) => {
      // Update item description
      if (data.description !== undefined) {
        await tx
          .update(orderItems)
          .set({ description: data.description })
          .where(eq(orderItems.id, itemId));
      }

      // Update quantity and price for each size
      let totalQuantity = 0;
      for (const sizeData of data.sizes) {
        const [existingSize] = await tx
          .select({ id: orderItemSizes.id })
          .from(orderItemSizes)
          .where(
            and(
              eq(orderItemSizes.orderItemId, itemId),
              eq(orderItemSizes.size, sizeData.size),
            ),
          )
          .limit(1);

        const sizeSubtotal = parseDecimal(sizeData.unitPrice) * sizeData.quantity;
        totalQuantity += sizeData.quantity;

        if (existingSize) {
          await tx
            .update(orderItemSizes)
            .set({
              quantity: sizeData.quantity,
              unitPrice: sizeData.unitPrice,
              subtotal: sizeSubtotal.toFixed(2),
            })
            .where(eq(orderItemSizes.id, existingSize.id));
        }
      }

      // Recalculate item subtotal and quantity
      const sizes = await tx
        .select({ subtotal: orderItemSizes.subtotal, quantity: orderItemSizes.quantity })
        .from(orderItemSizes)
        .where(eq(orderItemSizes.orderItemId, itemId));

      const itemSubtotal = sizes.reduce((sum, s) => sum + parseDecimal(s.subtotal), 0);
      const itemQuantity = sizes.reduce((sum, s) => sum + s.quantity, 0);
      await tx
        .update(orderItems)
        .set({ quantity: itemQuantity, subtotal: itemSubtotal.toFixed(2) })
        .where(eq(orderItems.id, itemId));

      // Recalculate order totals using helper
      await this.recalculateOrderTotals(tx, orderId);

      // Return updated order
      const [updated] = await tx.select().from(orders).where(eq(orders.id, orderId));
      return updated!;
    });
  }

  /** Update order notes */
  async updateOrderNotes(orderId: string, data: UpdateOrderNotesData) {
    const permissions = await this.getEditPermissions(orderId);
    if (!permissions.canEditPrices) {
      throw new BadRequestException('Notes cannot be changed once order is released.');
    }

    const [order] = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) throw new NotFoundException('Order not found.');

    const [updated] = await this.db
      .update(orders)
      .set({ notes: data.notes })
      .where(eq(orders.id, orderId))
      .returning();

    return updated!;
  }

  /** Add a new item to a confirmed order */
  async addOrderItem(orderId: string, data: AddOrderItemData) {
    const permissions = await this.getEditPermissions(orderId);
    if (!permissions.canAddItems) {
      throw new BadRequestException('Items cannot be added once order is released.');
    }

    const [order] = await this.db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) throw new NotFoundException('Order not found.');

    return await this.db.transaction(async (tx) => {
      // Insert order item using helper
      const itemId = await this.insertOrderItem(tx, orderId, {
        productId: data.productId,
        description: data.description,
        sizes: data.sizes,
        roster: data.roster,
      });

      // Calculate quantity for production jobs
      const itemQty = data.sizes.reduce((sum, s) => sum + s.quantity, 0);

      // If order is confirmed or beyond, create production jobs using helper
      if (order.status !== 'QUOTATION') {
        await this.createProductionJobsForItem(tx, orderId, itemId, itemQty);
      }

      // Recalculate order totals using helper
      await this.recalculateOrderTotals(tx, orderId);

      // Fetch and return the created item
      const [createdItem] = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.id, itemId));

      return createdItem!;
    });
  }

  async delete(id: string): Promise<void> {
    const [order] = await this.db.select({ status: orders.status }).from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) throw new NotFoundException('Order not found.');

    if (order.status !== 'QUOTATION') {
      throw new BadRequestException('Only quotations can be deleted. Cancel the order instead.');
    }

    await this.db.delete(orders).where(eq(orders.id, id));
  }

  /** Confirm an order (internal method for auto-confirmation on payment) */
  async confirmOrder(id: string): Promise<void> {
    const [existing] = await this.db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Order not found.');
    if (existing.status !== 'QUOTATION') return; // Already confirmed or other status

    await this.db.transaction(async (tx) => {
      // Get current electricity rate
      const [currentRate] = await tx
        .select({ ratePerKwh: electricityRates.ratePerKwh })
        .from(electricityRates)
        .orderBy(desc(electricityRates.effectiveDate))
        .limit(1);

      // Update order status to CONFIRMED
      await tx
        .update(orders)
        .set({
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          electricityRatePerKwh: currentRate?.ratePerKwh ?? null,
        })
        .where(eq(orders.id, id));

      // Create all order snapshots (materials, processes, production jobs, costs)
      await this.createOrderSnapshots(tx, id, currentRate?.ratePerKwh ?? null);
    });
  }
}

export interface OrderItemDetail {
  id: string;
  productId: string;
  productName: string;
  description: string | null;
  quantity: number;
  subtotal: string;
  sizes: {
    id: string;
    orderItemId: string;
    size: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
  }[];
  roster: {
    id: string;
    orderItemId: string;
    playerName: string;
    jerseyNumber: string | null;
    size: string;
  }[];
}

export interface PaymentRow {
  id: string;
  paymentDate: string;
  amount: string;
  method: string;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface ProductionJobRow {
  id: string;
  orderItemId: string;
  stage: string;
  sequence: number;
  status: string;
  designJobId: string | null;
  designApprovalStatus: string | null;
}
