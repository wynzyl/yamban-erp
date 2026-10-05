import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ListPurchaseRequestsQuery,
  PurchaseRequestStatus,
  ReceivePurchaseRequestData,
  UpdatePurchaseRequestData,
} from '@yamban/shared';
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import {
  inventoryTransactions,
  materials,
  orderItems,
  orderMaterials,
  orders,
  purchaseRequestLineOrders,
  purchaseRequestLines,
  purchaseRequests,
  suppliers,
} from '../db/schema/index.js';
import { InventoryService } from '../inventory/inventory.service.js';

export interface PurchaseRequestListRow {
  id: string;
  prNumber: string;
  supplierId: string | null;
  supplierName: string | null;
  status: PurchaseRequestStatus;
  neededBy: string | null;
  lineCount: number;
  estimatedTotal: string;
  createdAt: Date;
}

export interface PurchaseRequestLineRow {
  id: string;
  materialId: string;
  materialName: string;
  materialColor: string | null;
  materialUnit: string;
  purchaseUnit: string;
  purchaseQuantity: string;
  shortageQuantity: string;
  purchaseQty: string;
  estimatedUnitCost: string;
  estimatedTotal: string;
  linkedOrders: { orderId: string; orderNumber: string; quantity: string }[];
}

export interface PurchaseRequestDetail {
  id: string;
  prNumber: string;
  supplierId: string | null;
  supplierName: string | null;
  supplierContactPerson: string | null;
  supplierMobile: string | null;
  supplierEmail: string | null;
  supplierAddress: string | null;
  status: PurchaseRequestStatus;
  neededBy: string | null;
  notes: string | null;
  receivedAt: Date | null;
  createdAt: Date;
  lines: PurchaseRequestLineRow[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ShortageInfo {
  materialId: string;
  materialName: string;
  materialColor: string | null;
  materialUnit: string;
  purchaseUnit: string;
  purchaseQuantity: string;
  supplierId: string | null;
  supplierName: string | null;
  stockOnHand: string;
  reserved: string;
  available: string;
  shortage: string;
  averageUnitCost: string;
  linkedOrders: { orderId: string; orderNumber: string; quantity: string }[];
}

@Injectable()
export class PurchaseRequestsService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly inventoryService: InventoryService,
  ) {}

  /** List purchase requests with pagination and filters */
  async list(q: ListPurchaseRequestsQuery): Promise<Paginated<PurchaseRequestListRow>> {
    const conditions: SQL[] = [];

    if (q.status) {
      conditions.push(eq(purchaseRequests.status, q.status));
    }
    if (q.supplierId) {
      conditions.push(eq(purchaseRequests.supplierId, q.supplierId));
    }
    if (q.search) {
      const term = `%${q.search.replace(/[%_\\]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(purchaseRequests.prNumber, term),
          ilike(suppliers.name, term),
        )!,
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const limit = q.limit;
    const offset = (q.page - 1) * limit;

    // Subquery for line count and estimated total
    const linesSubquery = this.db
      .select({
        purchaseRequestId: purchaseRequestLines.purchaseRequestId,
        lineCount: sql<number>`count(*)::int`.as('line_count'),
        estimatedTotal: sql<string>`COALESCE(SUM(${purchaseRequestLines.estimatedTotal}), '0')`.as('estimated_total'),
      })
      .from(purchaseRequestLines)
      .groupBy(purchaseRequestLines.purchaseRequestId)
      .as('lines');

    const [rows, total] = await Promise.all([
      this.db
        .select({
          id: purchaseRequests.id,
          prNumber: purchaseRequests.prNumber,
          supplierId: purchaseRequests.supplierId,
          supplierName: suppliers.name,
          status: purchaseRequests.status,
          neededBy: purchaseRequests.neededBy,
          lineCount: sql<number>`COALESCE(${linesSubquery.lineCount}, 0)`,
          estimatedTotal: sql<string>`COALESCE(${linesSubquery.estimatedTotal}, '0')`,
          createdAt: purchaseRequests.createdAt,
        })
        .from(purchaseRequests)
        .leftJoin(suppliers, eq(suppliers.id, purchaseRequests.supplierId))
        .leftJoin(linesSubquery, eq(linesSubquery.purchaseRequestId, purchaseRequests.id))
        .where(where)
        .orderBy(desc(purchaseRequests.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.$count(
        this.db
          .select({ id: purchaseRequests.id })
          .from(purchaseRequests)
          .leftJoin(suppliers, eq(suppliers.id, purchaseRequests.supplierId))
          .where(where)
          .as('pr'),
      ),
    ]);

    return { items: rows, page: q.page, pageSize: limit, total };
  }

  /** Get purchase request detail with lines */
  async get(id: string): Promise<PurchaseRequestDetail> {
    const [pr] = await this.db
      .select({
        id: purchaseRequests.id,
        prNumber: purchaseRequests.prNumber,
        supplierId: purchaseRequests.supplierId,
        supplierName: suppliers.name,
        supplierContactPerson: suppliers.contactPerson,
        supplierMobile: suppliers.mobile,
        supplierEmail: suppliers.email,
        supplierAddress: suppliers.address,
        status: purchaseRequests.status,
        neededBy: purchaseRequests.neededBy,
        notes: purchaseRequests.notes,
        receivedAt: purchaseRequests.receivedAt,
        createdAt: purchaseRequests.createdAt,
      })
      .from(purchaseRequests)
      .leftJoin(suppliers, eq(suppliers.id, purchaseRequests.supplierId))
      .where(eq(purchaseRequests.id, id))
      .limit(1);

    if (!pr) throw new NotFoundException('Purchase request not found.');

    // Get lines
    const linesRaw = await this.db
      .select({
        id: purchaseRequestLines.id,
        materialId: purchaseRequestLines.materialId,
        materialName: materials.name,
        materialColor: materials.color,
        materialUnit: materials.unit,
        purchaseUnit: materials.purchaseUnit,
        purchaseQuantity: materials.purchaseQuantity,
        shortageQuantity: purchaseRequestLines.shortageQuantity,
        purchaseQty: purchaseRequestLines.purchaseQuantity,
        estimatedUnitCost: purchaseRequestLines.estimatedUnitCost,
        estimatedTotal: purchaseRequestLines.estimatedTotal,
      })
      .from(purchaseRequestLines)
      .innerJoin(materials, eq(materials.id, purchaseRequestLines.materialId))
      .where(eq(purchaseRequestLines.purchaseRequestId, id));

    // Get linked orders for each line
    const lines: PurchaseRequestLineRow[] = [];
    for (const line of linesRaw) {
      const linkedOrders = await this.db
        .select({
          orderId: purchaseRequestLineOrders.orderId,
          orderNumber: orders.orderNumber,
          quantity: purchaseRequestLineOrders.quantity,
        })
        .from(purchaseRequestLineOrders)
        .innerJoin(orders, eq(orders.id, purchaseRequestLineOrders.orderId))
        .where(eq(purchaseRequestLineOrders.purchaseRequestLineId, line.id));

      lines.push({ ...line, linkedOrders });
    }

    return { ...pr, lines };
  }

  /** Calculate material shortages - includes both order-based shortages and materials below reorder level */
  async calculateShortages(): Promise<ShortageInfo[]> {
    const shortages: ShortageInfo[] = [];
    const processedMaterialIds = new Set<string>();

    // PART 1: Get order-based shortages (materials where reserved > available)
    const reservations = await this.db
      .select({
        materialId: orderMaterials.materialId,
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        quantity: sql<string>`SUM(${orderMaterials.totalQuantity})`,
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
      .groupBy(orderMaterials.materialId, orders.id, orders.orderNumber);

    // Group by material
    const materialReservations = new Map<string, { total: number; orders: { orderId: string; orderNumber: string; quantity: string }[] }>();
    for (const res of reservations) {
      const existing = materialReservations.get(res.materialId) ?? { total: 0, orders: [] };
      const qty = parseFloat(res.quantity);
      existing.total += qty;
      existing.orders.push({
        orderId: res.orderId,
        orderNumber: res.orderNumber,
        quantity: res.quantity,
      });
      materialReservations.set(res.materialId, existing);
    }

    // Process order-based shortages
    for (const [materialId, reservation] of materialReservations) {
      const [mat] = await this.db
        .select({
          id: materials.id,
          name: materials.name,
          color: materials.color,
          unit: materials.unit,
          purchaseUnit: materials.purchaseUnit,
          purchaseQuantity: materials.purchaseQuantity,
          stockOnHand: materials.stockOnHand,
          averageUnitCost: materials.averageUnitCost,
          reorderLevel: materials.reorderLevel,
          supplierId: materials.defaultSupplierId,
          supplierName: suppliers.name,
        })
        .from(materials)
        .leftJoin(suppliers, eq(suppliers.id, materials.defaultSupplierId))
        .where(eq(materials.id, materialId))
        .limit(1);

      if (!mat) continue;

      const stock = parseFloat(mat.stockOnHand);
      const reserved = reservation.total;
      const available = stock;
      const shortage = reserved - available;

      if (shortage > 0) {
        shortages.push({
          materialId: mat.id,
          materialName: mat.name,
          materialColor: mat.color,
          materialUnit: mat.unit,
          purchaseUnit: mat.purchaseUnit,
          purchaseQuantity: mat.purchaseQuantity,
          supplierId: mat.supplierId,
          supplierName: mat.supplierName,
          stockOnHand: mat.stockOnHand,
          reserved: reserved.toFixed(3),
          available: available.toFixed(3),
          shortage: shortage.toFixed(3),
          averageUnitCost: mat.averageUnitCost,
          linkedOrders: reservation.orders,
        });
        processedMaterialIds.add(mat.id);
      }
    }

    // PART 2: Get materials below reorder level (not already processed)
    const lowStockMaterials = await this.db
      .select({
        id: materials.id,
        name: materials.name,
        color: materials.color,
        unit: materials.unit,
        purchaseUnit: materials.purchaseUnit,
        purchaseQuantity: materials.purchaseQuantity,
        stockOnHand: materials.stockOnHand,
        averageUnitCost: materials.averageUnitCost,
        reorderLevel: materials.reorderLevel,
        supplierId: materials.defaultSupplierId,
        supplierName: suppliers.name,
      })
      .from(materials)
      .leftJoin(suppliers, eq(suppliers.id, materials.defaultSupplierId))
      .where(
        and(
          eq(materials.active, true),
          sql`${materials.stockOnHand}::numeric <= ${materials.reorderLevel}::numeric`,
          sql`${materials.reorderLevel}::numeric > 0`,
        ),
      );

    for (const mat of lowStockMaterials) {
      // Skip if already processed from order shortages
      if (processedMaterialIds.has(mat.id)) continue;

      const stock = parseFloat(mat.stockOnHand);
      const reorderLevel = parseFloat(mat.reorderLevel);

      // Calculate shortage as: reorder level - current stock (to bring stock up to reorder level)
      const shortage = reorderLevel - stock;

      if (shortage > 0) {
        shortages.push({
          materialId: mat.id,
          materialName: mat.name,
          materialColor: mat.color,
          materialUnit: mat.unit,
          purchaseUnit: mat.purchaseUnit,
          purchaseQuantity: mat.purchaseQuantity,
          supplierId: mat.supplierId,
          supplierName: mat.supplierName,
          stockOnHand: mat.stockOnHand,
          reserved: '0.000',
          available: stock.toFixed(3),
          shortage: shortage.toFixed(3),
          averageUnitCost: mat.averageUnitCost,
          linkedOrders: [], // No specific orders, just low stock
        });
      }
    }

    return shortages;
  }

  /** Build/update DRAFT purchase requests from shortages */
  async buildFromShortages(): Promise<{ created: number; updated: number }> {
    const shortages = await this.calculateShortages();

    if (shortages.length === 0) {
      return { created: 0, updated: 0 };
    }

    // Group shortages by supplier
    const bySupplier = new Map<string | null, ShortageInfo[]>();
    for (const shortage of shortages) {
      const key = shortage.supplierId;
      const existing = bySupplier.get(key) ?? [];
      existing.push(shortage);
      bySupplier.set(key, existing);
    }

    let created = 0;
    let updated = 0;

    return await this.db.transaction(async (tx) => {
      for (const [supplierId, supplierShortages] of bySupplier) {
        // Check for existing DRAFT PR for this supplier
        const [existingPr] = supplierId
          ? await tx
              .select({ id: purchaseRequests.id })
              .from(purchaseRequests)
              .where(
                and(
                  eq(purchaseRequests.supplierId, supplierId),
                  eq(purchaseRequests.status, 'DRAFT'),
                ),
              )
              .limit(1)
          : [];

        let prId: string;

        if (existingPr) {
          prId = existingPr.id;
          updated++;
        } else {
          // Generate new PR number
          const today = new Date();
          const year = today.getFullYear();
          const prefix = `PR-${year}-`;

          const [lastPr] = await tx
            .select({ prNumber: purchaseRequests.prNumber })
            .from(purchaseRequests)
            .where(ilike(purchaseRequests.prNumber, `${prefix}%`))
            .orderBy(desc(purchaseRequests.prNumber))
            .limit(1);

          let seq = 1;
          if (lastPr) {
            const lastSeq = parseInt(lastPr.prNumber.slice(-4), 10);
            if (!isNaN(lastSeq)) seq = lastSeq + 1;
          }
          const prNumber = `${prefix}${seq.toString().padStart(4, '0')}`;

          const [newPr] = await tx
            .insert(purchaseRequests)
            .values({
              prNumber,
              supplierId: supplierId ?? null,
              status: 'DRAFT',
            })
            .returning();

          prId = newPr!.id;
          created++;
        }

        // Delete existing lines for this PR (will rebuild)
        await tx
          .delete(purchaseRequestLines)
          .where(eq(purchaseRequestLines.purchaseRequestId, prId));

        // Insert new lines
        for (const shortage of supplierShortages) {
          // Round up to whole purchase units
          const purchaseQty = parseFloat(shortage.purchaseQuantity);
          const shortageQty = parseFloat(shortage.shortage);
          const unitsNeeded = Math.ceil(shortageQty / purchaseQty);
          const roundedQty = unitsNeeded * purchaseQty;
          const estimatedTotal = roundedQty * parseFloat(shortage.averageUnitCost);

          const [line] = await tx
            .insert(purchaseRequestLines)
            .values({
              purchaseRequestId: prId,
              materialId: shortage.materialId,
              shortageQuantity: shortage.shortage,
              purchaseQuantity: roundedQty.toFixed(3),
              estimatedUnitCost: shortage.averageUnitCost,
              estimatedTotal: estimatedTotal.toFixed(2),
            })
            .returning();

          // Link orders to this line
          for (const linkedOrder of shortage.linkedOrders) {
            await tx.insert(purchaseRequestLineOrders).values({
              purchaseRequestLineId: line!.id,
              orderId: linkedOrder.orderId,
              quantity: linkedOrder.quantity,
            });
          }
        }
      }

      return { created, updated };
    });
  }

  /** Update a DRAFT/PRINTED purchase request */
  async update(id: string, data: UpdatePurchaseRequestData) {
    const [pr] = await this.db
      .select({ status: purchaseRequests.status })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1);

    if (!pr) throw new NotFoundException('Purchase request not found.');
    if (pr.status !== 'DRAFT' && pr.status !== 'PRINTED') {
      throw new BadRequestException('Only DRAFT or PRINTED purchase requests can be updated.');
    }

    return await this.db.transaction(async (tx) => {
      // Update header
      const updates: Partial<typeof purchaseRequests.$inferInsert> = {};
      if (data.neededBy !== undefined) updates.neededBy = data.neededBy;
      if (data.notes !== undefined) updates.notes = data.notes;

      if (Object.keys(updates).length > 0) {
        await tx.update(purchaseRequests).set(updates).where(eq(purchaseRequests.id, id));
      }

      // Update lines if provided
      if (data.lines && data.lines.length > 0) {
        for (const lineData of data.lines) {
          const qty = parseFloat(lineData.purchaseQuantity);
          const cost = parseFloat(lineData.estimatedUnitCost);
          const total = qty * cost;

          await tx
            .update(purchaseRequestLines)
            .set({
              purchaseQuantity: lineData.purchaseQuantity,
              estimatedUnitCost: lineData.estimatedUnitCost,
              estimatedTotal: total.toFixed(2),
            })
            .where(eq(purchaseRequestLines.id, lineData.id));
        }
      }

      return await this.get(id);
    });
  }

  /** Mark a DRAFT PR as PRINTED */
  async markPrinted(id: string) {
    const [pr] = await this.db
      .select({ status: purchaseRequests.status })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1);

    if (!pr) throw new NotFoundException('Purchase request not found.');
    if (pr.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT purchase requests can be printed.');
    }

    await this.db
      .update(purchaseRequests)
      .set({ status: 'PRINTED' })
      .where(eq(purchaseRequests.id, id));

    return await this.get(id);
  }

  /** Receive a purchase request */
  async receive(id: string, data: ReceivePurchaseRequestData, userId: string) {
    const [pr] = await this.db
      .select({ status: purchaseRequests.status })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1);

    if (!pr) throw new NotFoundException('Purchase request not found.');
    if (pr.status !== 'PRINTED' && pr.status !== 'ORDERED') {
      throw new BadRequestException('Only PRINTED or ORDERED purchase requests can be received.');
    }

    return await this.db.transaction(async (tx) => {
      // Process each line
      for (const lineData of data.lines) {
        const [line] = await tx
          .select({
            materialId: purchaseRequestLines.materialId,
          })
          .from(purchaseRequestLines)
          .where(eq(purchaseRequestLines.id, lineData.purchaseRequestLineId))
          .limit(1);

        if (!line) continue;

        // Get supplier from PR
        const [prData] = await tx
          .select({ supplierId: purchaseRequests.supplierId })
          .from(purchaseRequests)
          .where(eq(purchaseRequests.id, id))
          .limit(1);

        // Create PURCHASE transaction
        await tx.insert(inventoryTransactions).values({
          materialId: line.materialId,
          type: 'PURCHASE',
          quantity: lineData.receivedQuantity,
          unitCost: lineData.actualUnitCost,
          supplierId: prData?.supplierId ?? null,
          purchaseRequestId: id,
          reference: data.reference,
          createdById: userId,
        });

        // Update stock cache and moving average
        const qty = parseFloat(lineData.receivedQuantity);
        const cost = parseFloat(lineData.actualUnitCost);

        // Get current material data
        const [mat] = await tx
          .select({
            stockOnHand: materials.stockOnHand,
            averageUnitCost: materials.averageUnitCost,
          })
          .from(materials)
          .where(eq(materials.id, line.materialId))
          .limit(1);

        if (mat) {
          // Update stock
          const newStock = parseFloat(mat.stockOnHand) + qty;

          // Calculate new moving average
          const currentStock = parseFloat(mat.stockOnHand);
          const currentAvg = parseFloat(mat.averageUnitCost);
          let newAvg: number;

          if (currentStock <= 0) {
            newAvg = cost;
          } else {
            newAvg = (currentStock * currentAvg + qty * cost) / newStock;
          }

          await tx
            .update(materials)
            .set({
              stockOnHand: newStock.toFixed(3),
              averageUnitCost: newAvg.toFixed(4),
            })
            .where(eq(materials.id, line.materialId));
        }
      }

      // Update PR status to RECEIVED
      await tx
        .update(purchaseRequests)
        .set({
          status: 'RECEIVED',
          receivedAt: new Date(),
        })
        .where(eq(purchaseRequests.id, id));

      // Update material status on linked orders
      await this.updateOrderMaterialStatuses(tx);

      return await this.get(id);
    });
  }

  /** Cancel a DRAFT or PRINTED PR */
  async cancel(id: string) {
    const [pr] = await this.db
      .select({ status: purchaseRequests.status })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1);

    if (!pr) throw new NotFoundException('Purchase request not found.');
    if (pr.status !== 'DRAFT' && pr.status !== 'PRINTED') {
      throw new BadRequestException('Only DRAFT or PRINTED purchase requests can be cancelled.');
    }

    await this.db
      .update(purchaseRequests)
      .set({ status: 'CANCELLED' })
      .where(eq(purchaseRequests.id, id));

    return { success: true };
  }

  /** Helper: Update material status on orders after receiving materials */
  private async updateOrderMaterialStatuses(tx: Database): Promise<void> {
    // Get all CONFIRMED/IN_PRODUCTION orders with their material status
    const ordersToCheck = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(sql`${orders.status} IN ('CONFIRMED', 'IN_PRODUCTION')`);

    for (const order of ordersToCheck) {
      // Check if any materials are still short
      const [shortage] = await tx
        .select({
          hasShortage: sql<boolean>`EXISTS (
            SELECT 1
            FROM order_materials om
            INNER JOIN order_items oi ON oi.id = om.order_item_id
            INNER JOIN materials m ON m.id = om.material_id
            WHERE oi.order_id = ${order.id}
            AND om.consumed_at IS NULL
            AND (
              SELECT COALESCE(SUM(it.quantity), 0)
              FROM inventory_transactions it
              WHERE it.material_id = om.material_id
            ) < (
              SELECT COALESCE(SUM(om2.total_quantity), 0)
              FROM order_materials om2
              INNER JOIN order_items oi2 ON oi2.id = om2.order_item_id
              INNER JOIN orders o2 ON o2.id = oi2.order_id
              WHERE om2.material_id = om.material_id
              AND om2.consumed_at IS NULL
              AND o2.status IN ('CONFIRMED', 'IN_PRODUCTION')
            )
          )`,
        })
        .from(sql`(SELECT 1) AS dummy`);

      const newStatus = shortage?.hasShortage ? 'SHORT' : 'COMPLETE';
      await tx
        .update(orders)
        .set({ materialStatus: newStatus })
        .where(eq(orders.id, order.id));
    }
  }
}
