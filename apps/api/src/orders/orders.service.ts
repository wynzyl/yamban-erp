import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AddOrderItemData,
  CreateOrderData,
  EditOrderData,
  EditPermissions,
  ListQuery,
  OrderStatus,
  Paginated,
  UpdateItemPricesData,
  UpdateOrderData,
  UpdateOrderNotesData,
  UpdateRosterData,
} from '@yamban/shared';
import { PRODUCTION_STAGES } from '@yamban/shared';
import { and, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import {
  customers,
  designJobs,
  electricityRates,
  machines,
  materials,
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
  total: string;
  paidAmount: string;
  itemCount: number;
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

@Injectable()
export class OrdersService {
  constructor(@InjectDb() private readonly db: Database) {}

  async list(q: ListQuery & { status?: string }): Promise<Paginated<OrderListRow>> {
    const conditions: SQL[] = [];

    if (q.search) {
      const term = `%${q.search.replace(/[%_\\]/g, '\\$&')}%`;
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
      conditions.push(eq(orders.status, q.status as OrderStatus));
    }

    const where = conditions.length ? and(...conditions) : undefined;

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
        })
        .from(orders)
        .innerJoin(customers, eq(customers.id, orders.customerId))
        .leftJoin(organizations, eq(organizations.id, orders.organizationId))
        .leftJoin(paidSubquery, eq(paidSubquery.orderId, orders.id))
        .leftJoin(itemCountSubquery, eq(itemCountSubquery.orderId, orders.id))
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

    return { items: rows, page: q.page, pageSize: q.pageSize, total };
  }

  async get(id: string): Promise<OrderDetailRow & { items: OrderItemDetail[]; payments: PaymentRow[]; productionJobs: ProductionJobRow[] }> {
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

    return { ...order, items, payments: paymentsRaw, productionJobs: prodJobs };
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
        subtotal += parseFloat(size.unitPrice) * size.quantity;
      }
    }
    const discount = parseFloat(data.discount ?? '0');
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

      // Insert items
      for (const itemData of data.items) {
        let itemQty = 0;
        let itemSubtotal = 0;
        for (const size of itemData.sizes) {
          itemQty += size.quantity;
          itemSubtotal += parseFloat(size.unitPrice) * size.quantity;
        }

        const [item] = await tx
          .insert(orderItems)
          .values({
            orderId: order!.id,
            productId: itemData.productId,
            description: itemData.description,
            quantity: itemQty,
            subtotal: itemSubtotal.toFixed(2),
          })
          .returning();

        // Insert sizes
        for (const sizeData of itemData.sizes) {
          const sizeSubtotal = parseFloat(sizeData.unitPrice) * sizeData.quantity;
          await tx.insert(orderItemSizes).values({
            orderItemId: item!.id,
            size: sizeData.size,
            quantity: sizeData.quantity,
            unitPrice: sizeData.unitPrice,
            subtotal: sizeSubtotal.toFixed(2),
          });
        }

        // Insert roster entries
        if (itemData.roster && itemData.roster.length > 0) {
          for (const rosterEntry of itemData.roster) {
            await tx.insert(orderRoster).values({
              orderItemId: item!.id,
              playerName: rosterEntry.playerName,
              jerseyNumber: rosterEntry.jerseyNumber || null,
              size: rosterEntry.size,
            });
          }
        }
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
        const total = Math.max(0, parseFloat(order.subtotal) - parseFloat(data.discount));
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

        const [updated] = await tx.update(orders).set(updates).where(eq(orders.id, id)).returning();

        // Fetch all order items with their sizes
        const items = await tx
          .select({
            id: orderItems.id,
            productId: orderItems.productId,
            quantity: orderItems.quantity,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, id));

        // Track if any materials are short
        let hasShortage = false;

        // Create material snapshots and production jobs for each item
        for (const item of items) {
          // Get sizes for this item
          const sizes = await tx
            .select({ size: orderItemSizes.size, quantity: orderItemSizes.quantity })
            .from(orderItemSizes)
            .where(eq(orderItemSizes.orderItemId, item.id));

          // For each size, look up the recipe and copy materials
          for (const sizeRow of sizes) {
            // Find the recipe for this product+size
            const [recipe] = await tx
              .select({ id: productRecipes.id })
              .from(productRecipes)
              .where(
                and(
                  eq(productRecipes.productId, item.productId),
                  eq(productRecipes.size, sizeRow.size),
                ),
              )
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

              // Copy each material to orderMaterials
              for (const mat of recipeMatRows) {
                const qtyPerPiece = parseFloat(mat.quantityPerPiece);
                const totalQty = qtyPerPiece * sizeRow.quantity;
                const unitCost = parseFloat(mat.averageUnitCost);
                const totalCost = totalQty * unitCost;

                await tx.insert(orderMaterials).values({
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
                const stock = parseFloat(mat.stockOnHand);
                if (stock < totalQty) {
                  hasShortage = true;
                }
              }
            }

          }

          // Copy machine processes for this product (processes are per-product, not per-size)
          const processes = await tx
            .select({
              machineId: productSizeProcesses.machineId,
              minutesPerPiece: productSizeProcesses.minutesPerPiece,
              powerKw: machines.powerKw,
            })
            .from(productSizeProcesses)
            .innerJoin(machines, eq(machines.id, productSizeProcesses.machineId))
            .where(eq(productSizeProcesses.productId, item.productId));

          // Create orderItemProcesses for each size with that size's quantity
          for (const sizeRow of sizes) {
            for (const proc of processes) {
              await tx.insert(orderItemProcesses).values({
                orderItemId: item.id,
                size: sizeRow.size,
                machineId: proc.machineId,
                powerKw: proc.powerKw,
                minutesPerPiece: proc.minutesPerPiece,
                quantity: sizeRow.quantity,
              });
            }
          }

          // Create production jobs for each stage
          for (const [i, stage] of PRODUCTION_STAGES.entries()) {
            const [job] = await tx
              .insert(productionJobs)
              .values({
                orderId: id,
                orderItemId: item.id,
                stage,
                sequence: i + 1,
                plannedQuantity: item.quantity,
              })
              .returning();

            // For DESIGN stage, also create a design_jobs row
            if (stage === 'DESIGN' && job) {
              await tx.insert(designJobs).values({
                productionJobId: job.id,
              });
            }
          }
        }

        // Update material status based on shortage check
        if (hasShortage) {
          await tx
            .update(orders)
            .set({ materialStatus: 'SHORT' })
            .where(eq(orders.id, id));
        }

        return updated!;
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
        subtotal += parseFloat(size.unitPrice) * size.quantity;
      }
    }
    const discount = parseFloat(data.discount ?? '0');
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
        let itemQty = 0;
        let itemSubtotal = 0;
        for (const size of itemData.sizes) {
          itemQty += size.quantity;
          itemSubtotal += parseFloat(size.unitPrice) * size.quantity;
        }

        let itemId: string;

        if (itemData.id && existingItemIds.has(itemData.id)) {
          // Update existing item
          await tx
            .update(orderItems)
            .set({
              description: itemData.description,
              quantity: itemQty,
              subtotal: itemSubtotal.toFixed(2),
            })
            .where(eq(orderItems.id, itemData.id));

          itemId = itemData.id;
          updatedItemIds.add(itemId);

          // Delete old sizes and roster for this item
          await tx.delete(orderItemSizes).where(eq(orderItemSizes.orderItemId, itemId));
          await tx.delete(orderRoster).where(eq(orderRoster.orderItemId, itemId));
        } else {
          // Insert new item
          const [item] = await tx
            .insert(orderItems)
            .values({
              orderId: id,
              productId: itemData.productId,
              description: itemData.description,
              quantity: itemQty,
              subtotal: itemSubtotal.toFixed(2),
            })
            .returning();

          itemId = item!.id;
        }

        // Insert sizes
        for (const sizeData of itemData.sizes) {
          const sizeSubtotal = parseFloat(sizeData.unitPrice) * sizeData.quantity;
          await tx.insert(orderItemSizes).values({
            orderItemId: itemId,
            size: sizeData.size,
            quantity: sizeData.quantity,
            unitPrice: sizeData.unitPrice,
            subtotal: sizeSubtotal.toFixed(2),
          });
        }

        // Insert roster entries
        if (itemData.roster && itemData.roster.length > 0) {
          for (const rosterEntry of itemData.roster) {
            await tx.insert(orderRoster).values({
              orderItemId: itemId,
              playerName: rosterEntry.playerName,
              jerseyNumber: rosterEntry.jerseyNumber || null,
              size: rosterEntry.size,
            });
          }
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

      // Insert new roster entries
      for (const entry of data.roster) {
        await tx.insert(orderRoster).values({
          orderItemId: itemId,
          playerName: entry.playerName,
          jerseyNumber: entry.jerseyNumber || null,
          size: entry.size,
        });
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

        const sizeSubtotal = parseFloat(sizeData.unitPrice) * sizeData.quantity;
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

      const itemSubtotal = sizes.reduce((sum, s) => sum + parseFloat(s.subtotal), 0);
      const itemQuantity = sizes.reduce((sum, s) => sum + s.quantity, 0);
      await tx
        .update(orderItems)
        .set({ quantity: itemQuantity, subtotal: itemSubtotal.toFixed(2) })
        .where(eq(orderItems.id, itemId));

      // Recalculate order totals
      const allItems = await tx
        .select({ subtotal: orderItems.subtotal })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      const orderSubtotal = allItems.reduce((sum, i) => sum + parseFloat(i.subtotal), 0);

      const [order] = await tx
        .select({ discount: orders.discount })
        .from(orders)
        .where(eq(orders.id, orderId));

      const discount = parseFloat(order?.discount ?? '0');
      const orderTotal = Math.max(0, orderSubtotal - discount);

      await tx
        .update(orders)
        .set({
          subtotal: orderSubtotal.toFixed(2),
          total: orderTotal.toFixed(2),
        })
        .where(eq(orders.id, orderId));

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
      // Calculate item totals
      let itemQty = 0;
      let itemSubtotal = 0;
      for (const size of data.sizes) {
        itemQty += size.quantity;
        itemSubtotal += parseFloat(size.unitPrice) * size.quantity;
      }

      // Insert order item
      const [item] = await tx
        .insert(orderItems)
        .values({
          orderId,
          productId: data.productId,
          description: data.description,
          quantity: itemQty,
          subtotal: itemSubtotal.toFixed(2),
        })
        .returning();

      // Insert sizes
      for (const sizeData of data.sizes) {
        const sizeSubtotal = parseFloat(sizeData.unitPrice) * sizeData.quantity;
        await tx.insert(orderItemSizes).values({
          orderItemId: item!.id,
          size: sizeData.size,
          quantity: sizeData.quantity,
          unitPrice: sizeData.unitPrice,
          subtotal: sizeSubtotal.toFixed(2),
        });
      }

      // Insert roster entries
      if (data.roster && data.roster.length > 0) {
        for (const rosterEntry of data.roster) {
          await tx.insert(orderRoster).values({
            orderItemId: item!.id,
            playerName: rosterEntry.playerName,
            jerseyNumber: rosterEntry.jerseyNumber || null,
            size: rosterEntry.size,
          });
        }
      }

      // If order is confirmed or beyond, create production jobs
      if (order.status !== 'QUOTATION') {
        for (const [i, stage] of PRODUCTION_STAGES.entries()) {
          const [job] = await tx
            .insert(productionJobs)
            .values({
              orderId,
              orderItemId: item!.id,
              stage,
              sequence: i + 1,
              plannedQuantity: itemQty,
            })
            .returning();

          // For DESIGN stage, create design_jobs row
          if (stage === 'DESIGN' && job) {
            await tx.insert(designJobs).values({
              productionJobId: job.id,
            });
          }
        }
      }

      // Recalculate order totals
      const allItems = await tx
        .select({ subtotal: orderItems.subtotal })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      const orderSubtotal = allItems.reduce((sum, i) => sum + parseFloat(i.subtotal), 0);

      const [existingOrder] = await tx
        .select({ discount: orders.discount })
        .from(orders)
        .where(eq(orders.id, orderId));

      const discount = parseFloat(existingOrder?.discount ?? '0');
      const orderTotal = Math.max(0, orderSubtotal - discount);

      await tx
        .update(orders)
        .set({
          subtotal: orderSubtotal.toFixed(2),
          total: orderTotal.toFixed(2),
        })
        .where(eq(orders.id, orderId));

      return item!;
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

      // Fetch all order items with product info
      const items = await tx
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, id));

      // Track if any materials are short
      let hasShortage = false;

      // Create material snapshots and production jobs for each item
      for (const item of items) {
        // Get sizes for this item
        const sizes = await tx
          .select({ size: orderItemSizes.size, quantity: orderItemSizes.quantity })
          .from(orderItemSizes)
          .where(eq(orderItemSizes.orderItemId, item.id));

        // For each size, look up the recipe and copy materials
        for (const sizeRow of sizes) {
          // Find the recipe for this product+size
          const [recipe] = await tx
            .select({ id: productRecipes.id })
            .from(productRecipes)
            .where(
              and(
                eq(productRecipes.productId, item.productId),
                eq(productRecipes.size, sizeRow.size),
              ),
            )
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

            // Copy each material to orderMaterials
            for (const mat of recipeMatRows) {
              const qtyPerPiece = parseFloat(mat.quantityPerPiece);
              const totalQty = qtyPerPiece * sizeRow.quantity;
              const unitCost = parseFloat(mat.averageUnitCost);
              const totalCost = totalQty * unitCost;

              await tx.insert(orderMaterials).values({
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
              const stock = parseFloat(mat.stockOnHand);
              if (stock < totalQty) {
                hasShortage = true;
              }
            }
          }

        }

        // Copy machine processes for this product (processes are per-product, not per-size)
        const processes = await tx
          .select({
            machineId: productSizeProcesses.machineId,
            minutesPerPiece: productSizeProcesses.minutesPerPiece,
            powerKw: machines.powerKw,
          })
          .from(productSizeProcesses)
          .innerJoin(machines, eq(machines.id, productSizeProcesses.machineId))
          .where(eq(productSizeProcesses.productId, item.productId));

        // Create orderItemProcesses for each size with that size's quantity
        for (const sizeRow of sizes) {
          for (const proc of processes) {
            await tx.insert(orderItemProcesses).values({
              orderItemId: item.id,
              size: sizeRow.size,
              machineId: proc.machineId,
              powerKw: proc.powerKw,
              minutesPerPiece: proc.minutesPerPiece,
              quantity: sizeRow.quantity,
            });
          }
        }

        // Create production jobs for each stage
        for (const [i, stage] of PRODUCTION_STAGES.entries()) {
          const [job] = await tx
            .insert(productionJobs)
            .values({
              orderId: id,
              orderItemId: item.id,
              stage,
              sequence: i + 1,
              plannedQuantity: item.quantity,
            })
            .returning();

          // For DESIGN stage, also create a design_jobs row
          if (stage === 'DESIGN' && job) {
            await tx.insert(designJobs).values({
              productionJobId: job.id,
            });
          }
        }
      }

      // Update material status based on shortage check
      if (hasShortage) {
        await tx
          .update(orders)
          .set({ materialStatus: 'SHORT' })
          .where(eq(orders.id, id));
      }
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
