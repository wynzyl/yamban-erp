import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateOrderData, ListQuery, OrderStatus, Paginated, UpdateOrderData } from '@yamban/shared';
import { PRODUCTION_STAGES } from '@yamban/shared';
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import {
  customers,
  designJobs,
  orderItems,
  orderItemSizes,
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

  async get(id: string): Promise<OrderDetailRow & { items: OrderItemDetail[]; payments: PaymentRow[] }> {
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

    const items: OrderItemDetail[] = itemsRaw.map((item) => ({
      ...item,
      sizes: sizesByItem.get(item.id) ?? [],
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

    return { ...order, items, payments: paymentsRaw };
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

  async delete(id: string): Promise<void> {
    const [order] = await this.db.select({ status: orders.status }).from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) throw new NotFoundException('Order not found.');

    if (order.status !== 'QUOTATION') {
      throw new BadRequestException('Only quotations can be deleted. Cancel the order instead.');
    }

    await this.db.delete(orders).where(eq(orders.id, id));
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
