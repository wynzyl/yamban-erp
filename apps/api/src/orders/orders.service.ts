import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateOrderData, EditOrderData, ListQuery, OrderStatus, Paginated, UpdateOrderData } from '@yamban/shared';
import { PRODUCTION_STAGES } from '@yamban/shared';
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import {
  customers,
  designJobs,
  orderItems,
  orderItemSizes,
  orderRoster,
  orders,
  organizations,
  payments,
  productionJobs,
  products,
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

    // When confirming, create production jobs in a transaction
    if (data.status === 'CONFIRMED' && existing.status === 'QUOTATION') {
      return await this.db.transaction(async (tx) => {
        const [updated] = await tx.update(orders).set(updates).where(eq(orders.id, id)).returning();

        // Fetch all order items
        const items = await tx
          .select({ id: orderItems.id, quantity: orderItems.quantity })
          .from(orderItems)
          .where(eq(orderItems.orderId, id));

        // Create production jobs for each item and stage
        for (const item of items) {
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
          sql`${productionJobs.status} != 'PENDING'`, // Started jobs
        ),
      );

    return (printingOrBeyond?.count ?? 0) === 0;
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
      // Update order status to CONFIRMED
      await tx
        .update(orders)
        .set({
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        })
        .where(eq(orders.id, id));

      // Fetch all order items
      const items = await tx
        .select({ id: orderItems.id, quantity: orderItems.quantity })
        .from(orderItems)
        .where(eq(orderItems.orderId, id));

      // Create production jobs for each item and stage
      for (const item of items) {
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
