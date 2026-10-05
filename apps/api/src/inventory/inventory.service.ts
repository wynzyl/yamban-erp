import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  InventoryTxnType,
  ListInventoryQuery,
  ProductionStage,
  RecordAdjustmentData,
  RecordWasteData,
  ProcessReturnData,
} from '@yamban/shared';
import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import {
  inventoryTransactions,
  materials,
  orderItems,
  orderMaterials,
  orders,
  suppliers,
} from '../db/schema/index.js';

export interface InventoryTransactionRow {
  id: string;
  materialId: string;
  materialName: string;
  materialColor: string | null;
  materialUnit: string;
  type: InventoryTxnType;
  quantity: string;
  unitCost: string;
  supplierId: string | null;
  supplierName: string | null;
  orderId: string | null;
  orderNumber: string | null;
  reference: string | null;
  transactionDate: string;
  createdAt: Date;
}

export interface StockSummaryRow {
  id: string;
  name: string;
  color: string | null;
  category: string;
  unit: string;
  purchaseUnit: string;
  purchaseQuantity: string;
  stockOnHand: string;
  reservedQuantity: string;
  availableQuantity: string;
  averageUnitCost: string;
  reorderLevel: string;
  supplierName: string | null;
}

export interface MaterialStockDetail extends StockSummaryRow {
  recentTransactions: InventoryTransactionRow[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

@Injectable()
export class InventoryService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** List inventory transactions with pagination and filters */
  async listTransactions(q: ListInventoryQuery): Promise<Paginated<InventoryTransactionRow>> {
    const conditions: SQL[] = [];

    if (q.materialId) {
      conditions.push(eq(inventoryTransactions.materialId, q.materialId));
    }
    if (q.type) {
      conditions.push(eq(inventoryTransactions.type, q.type));
    }
    if (q.startDate) {
      conditions.push(gte(inventoryTransactions.transactionDate, q.startDate));
    }
    if (q.endDate) {
      conditions.push(lte(inventoryTransactions.transactionDate, q.endDate));
    }
    if (q.orderId) {
      conditions.push(eq(inventoryTransactions.orderId, q.orderId));
    }
    if (q.supplierId) {
      conditions.push(eq(inventoryTransactions.supplierId, q.supplierId));
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const limit = q.limit;
    const offset = (q.page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.db
        .select({
          id: inventoryTransactions.id,
          materialId: inventoryTransactions.materialId,
          materialName: materials.name,
          materialColor: materials.color,
          materialUnit: materials.unit,
          type: inventoryTransactions.type,
          quantity: inventoryTransactions.quantity,
          unitCost: inventoryTransactions.unitCost,
          supplierId: inventoryTransactions.supplierId,
          supplierName: suppliers.name,
          orderId: inventoryTransactions.orderId,
          orderNumber: orders.orderNumber,
          reference: inventoryTransactions.reference,
          transactionDate: inventoryTransactions.transactionDate,
          createdAt: inventoryTransactions.createdAt,
        })
        .from(inventoryTransactions)
        .innerJoin(materials, eq(materials.id, inventoryTransactions.materialId))
        .leftJoin(suppliers, eq(suppliers.id, inventoryTransactions.supplierId))
        .leftJoin(orders, eq(orders.id, inventoryTransactions.orderId))
        .where(where)
        .orderBy(desc(inventoryTransactions.transactionDate), desc(inventoryTransactions.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.$count(
        this.db
          .select({ id: inventoryTransactions.id })
          .from(inventoryTransactions)
          .where(where)
          .as('t'),
      ),
    ]);

    return { items: rows, page: q.page, pageSize: limit, total };
  }

  /** Get stock summary for all materials */
  async getStockSummary(): Promise<StockSummaryRow[]> {
    // Get reserved quantities (unconsumed order materials for CONFIRMED/IN_PRODUCTION orders)
    const reservedSubquery = this.db
      .select({
        materialId: orderMaterials.materialId,
        reserved: sql<string>`COALESCE(SUM(${orderMaterials.totalQuantity}), '0')`.as('reserved'),
      })
      .from(orderMaterials)
      .innerJoin(orderItems, eq(orderItems.id, orderMaterials.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          sql`${orderMaterials.consumedAt} IS NULL`,
          sql`${orders.status} IN ('CONFIRMED', 'IN_PRODUCTION')`,
        ),
      )
      .groupBy(orderMaterials.materialId)
      .as('reserved');

    const rows = await this.db
      .select({
        id: materials.id,
        name: materials.name,
        color: materials.color,
        category: materials.category,
        unit: materials.unit,
        purchaseUnit: materials.purchaseUnit,
        purchaseQuantity: materials.purchaseQuantity,
        stockOnHand: materials.stockOnHand,
        reservedQuantity: sql<string>`COALESCE(${reservedSubquery.reserved}, '0')`,
        availableQuantity: sql<string>`${materials.stockOnHand} - COALESCE(${reservedSubquery.reserved}, 0)`,
        averageUnitCost: materials.averageUnitCost,
        reorderLevel: materials.reorderLevel,
        supplierName: suppliers.name,
      })
      .from(materials)
      .leftJoin(suppliers, eq(suppliers.id, materials.defaultSupplierId))
      .leftJoin(reservedSubquery, eq(reservedSubquery.materialId, materials.id))
      .where(eq(materials.active, true))
      .orderBy(materials.category, materials.name);

    return rows;
  }

  /** Get detailed stock info for a single material */
  async getMaterialStock(materialId: string): Promise<MaterialStockDetail> {
    // Get reserved quantity
    const [reservedResult] = await this.db
      .select({
        reserved: sql<string>`COALESCE(SUM(${orderMaterials.totalQuantity}), '0')`,
      })
      .from(orderMaterials)
      .innerJoin(orderItems, eq(orderItems.id, orderMaterials.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orderMaterials.materialId, materialId),
          sql`${orderMaterials.consumedAt} IS NULL`,
          sql`${orders.status} IN ('CONFIRMED', 'IN_PRODUCTION')`,
        ),
      );

    const [material] = await this.db
      .select({
        id: materials.id,
        name: materials.name,
        color: materials.color,
        category: materials.category,
        unit: materials.unit,
        purchaseUnit: materials.purchaseUnit,
        purchaseQuantity: materials.purchaseQuantity,
        stockOnHand: materials.stockOnHand,
        averageUnitCost: materials.averageUnitCost,
        reorderLevel: materials.reorderLevel,
        supplierName: suppliers.name,
      })
      .from(materials)
      .leftJoin(suppliers, eq(suppliers.id, materials.defaultSupplierId))
      .where(eq(materials.id, materialId))
      .limit(1);

    if (!material) throw new NotFoundException('Material not found.');

    const reserved = reservedResult?.reserved ?? '0';
    const available = (parseFloat(material.stockOnHand) - parseFloat(reserved)).toFixed(3);

    // Get recent transactions
    const transactions = await this.db
      .select({
        id: inventoryTransactions.id,
        materialId: inventoryTransactions.materialId,
        materialName: materials.name,
        materialColor: materials.color,
        materialUnit: materials.unit,
        type: inventoryTransactions.type,
        quantity: inventoryTransactions.quantity,
        unitCost: inventoryTransactions.unitCost,
        supplierId: inventoryTransactions.supplierId,
        supplierName: suppliers.name,
        orderId: inventoryTransactions.orderId,
        orderNumber: orders.orderNumber,
        reference: inventoryTransactions.reference,
        transactionDate: inventoryTransactions.transactionDate,
        createdAt: inventoryTransactions.createdAt,
      })
      .from(inventoryTransactions)
      .innerJoin(materials, eq(materials.id, inventoryTransactions.materialId))
      .leftJoin(suppliers, eq(suppliers.id, inventoryTransactions.supplierId))
      .leftJoin(orders, eq(orders.id, inventoryTransactions.orderId))
      .where(eq(inventoryTransactions.materialId, materialId))
      .orderBy(desc(inventoryTransactions.transactionDate), desc(inventoryTransactions.createdAt))
      .limit(20);

    return {
      ...material,
      reservedQuantity: reserved,
      availableQuantity: available,
      recentTransactions: transactions,
    };
  }

  /** Core: Record an inventory transaction and update stock cache */
  async recordTransaction(data: {
    materialId: string;
    type: InventoryTxnType;
    quantity: string;
    unitCost: string;
    supplierId?: string | null;
    orderId?: string | null;
    purchaseRequestId?: string | null;
    reference?: string | null;
    createdById?: string | null;
  }) {
    return await this.db.transaction(async (tx) => {
      // Insert transaction
      const [txn] = await tx
        .insert(inventoryTransactions)
        .values({
          materialId: data.materialId,
          type: data.type,
          quantity: data.quantity,
          unitCost: data.unitCost,
          supplierId: data.supplierId ?? null,
          orderId: data.orderId ?? null,
          purchaseRequestId: data.purchaseRequestId ?? null,
          reference: data.reference ?? null,
          createdById: data.createdById ?? null,
        })
        .returning();

      // Update stock cache
      await this.updateStockCache(tx, data.materialId);

      // Update moving average cost only on PURCHASE transactions
      if (data.type === 'PURCHASE' && parseFloat(data.quantity) > 0) {
        await this.updateMovingAverageCost(tx, data.materialId, data.quantity, data.unitCost);
      }

      return txn!;
    });
  }

  /** Consume materials when a production stage starts */
  async consumeMaterialsForStage(
    orderItemId: string,
    stage: ProductionStage,
    createdById?: string,
  ): Promise<void> {
    // Get all unconsumed materials for this stage
    const materialsToConsume = await this.db
      .select({
        id: orderMaterials.id,
        materialId: orderMaterials.materialId,
        totalQuantity: orderMaterials.totalQuantity,
        unitCost: orderMaterials.unitCost,
        orderId: orders.id,
      })
      .from(orderMaterials)
      .innerJoin(orderItems, eq(orderItems.id, orderMaterials.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orderMaterials.orderItemId, orderItemId),
          eq(orderMaterials.stage, stage),
          sql`${orderMaterials.consumedAt} IS NULL`,
        ),
      );

    if (materialsToConsume.length === 0) return;

    await this.db.transaction(async (tx) => {
      for (const mat of materialsToConsume) {
        // Create consumption transaction (negative quantity)
        await tx.insert(inventoryTransactions).values({
          materialId: mat.materialId,
          type: 'ORDER_CONSUMPTION',
          quantity: `-${mat.totalQuantity}`, // Negative for consumption
          unitCost: mat.unitCost,
          orderId: mat.orderId,
          createdById: createdById ?? null,
        });

        // Mark as consumed
        await tx
          .update(orderMaterials)
          .set({ consumedAt: new Date() })
          .where(eq(orderMaterials.id, mat.id));

        // Update stock cache
        await this.updateStockCache(tx, mat.materialId);
      }
    });
  }

  /** Record manual adjustment */
  async recordAdjustment(data: RecordAdjustmentData, userId: string) {
    // Get material's current average cost if no cost provided
    let unitCost = data.unitCost;
    if (!unitCost) {
      const [mat] = await this.db
        .select({ averageUnitCost: materials.averageUnitCost })
        .from(materials)
        .where(eq(materials.id, data.materialId))
        .limit(1);
      unitCost = mat?.averageUnitCost ?? '0';
    }

    return await this.recordTransaction({
      materialId: data.materialId,
      type: 'ADJUSTMENT',
      quantity: data.quantity,
      unitCost,
      reference: data.reference,
      createdById: userId,
    });
  }

  /** Record waste */
  async recordWaste(data: RecordWasteData, userId: string) {
    // Get material's current average cost if no cost provided
    let unitCost = data.unitCost;
    if (!unitCost) {
      const [mat] = await this.db
        .select({ averageUnitCost: materials.averageUnitCost })
        .from(materials)
        .where(eq(materials.id, data.materialId))
        .limit(1);
      unitCost = mat?.averageUnitCost ?? '0';
    }

    return await this.recordTransaction({
      materialId: data.materialId,
      type: 'WASTE',
      quantity: `-${data.quantity}`, // Negative for waste
      unitCost,
      orderId: data.orderId,
      reference: data.reference,
      createdById: userId,
    });
  }

  /** Process returns from order cancellation */
  async processReturn(data: ProcessReturnData, userId: string) {
    const [order] = await this.db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.id, data.orderId))
      .limit(1);

    if (!order) throw new NotFoundException('Order not found.');

    return await this.db.transaction(async (tx) => {
      const results: { returns: typeof inventoryTransactions.$inferSelect[]; waste: typeof inventoryTransactions.$inferSelect[] } = {
        returns: [],
        waste: [],
      };

      for (const line of data.lines) {
        // Record return (positive quantity - adds back to stock)
        if (parseFloat(line.returnQuantity) > 0) {
          const [returnTxn] = await tx
            .insert(inventoryTransactions)
            .values({
              materialId: line.materialId,
              type: 'RETURN',
              quantity: line.returnQuantity,
              unitCost: line.unitCost,
              orderId: data.orderId,
              reference: data.reference,
              createdById: userId,
            })
            .returning();
          results.returns.push(returnTxn!);
        }

        // Record waste (negative quantity)
        if (parseFloat(line.wasteQuantity) > 0) {
          const [wasteTxn] = await tx
            .insert(inventoryTransactions)
            .values({
              materialId: line.materialId,
              type: 'WASTE',
              quantity: `-${line.wasteQuantity}`,
              unitCost: line.unitCost,
              orderId: data.orderId,
              reference: data.reference,
              createdById: userId,
            })
            .returning();
          results.waste.push(wasteTxn!);
        }

        // Update stock cache
        await this.updateStockCache(tx, line.materialId);
      }

      return results;
    });
  }

  /** Update the stockOnHand cache by summing all transactions */
  private async updateStockCache(tx: Database, materialId: string): Promise<void> {
    const [result] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(${inventoryTransactions.quantity}), '0')`,
      })
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.materialId, materialId));

    await tx
      .update(materials)
      .set({ stockOnHand: result?.total ?? '0' })
      .where(eq(materials.id, materialId));
  }

  /** Update moving average cost on PURCHASE transactions */
  private async updateMovingAverageCost(
    tx: Database,
    materialId: string,
    purchaseQty: string,
    purchaseUnitCost: string,
  ): Promise<void> {
    const [mat] = await tx
      .select({
        stockOnHand: materials.stockOnHand,
        averageUnitCost: materials.averageUnitCost,
      })
      .from(materials)
      .where(eq(materials.id, materialId))
      .limit(1);

    if (!mat) return;

    const currentStock = parseFloat(mat.stockOnHand);
    const currentAvgCost = parseFloat(mat.averageUnitCost);
    const newQty = parseFloat(purchaseQty);
    const newCost = parseFloat(purchaseUnitCost);

    // Moving average formula:
    // New Avg = (Current Stock * Current Avg + New Qty * New Cost) / (Current Stock + New Qty)
    // Note: stockOnHand already includes the new purchase at this point
    const prevStock = currentStock - newQty;

    let newAvgCost: number;
    if (prevStock <= 0) {
      // If no previous stock, new cost becomes the average
      newAvgCost = newCost;
    } else {
      newAvgCost = (prevStock * currentAvgCost + newQty * newCost) / currentStock;
    }

    await tx
      .update(materials)
      .set({ averageUnitCost: newAvgCost.toFixed(4) })
      .where(eq(materials.id, materialId));
  }
}
