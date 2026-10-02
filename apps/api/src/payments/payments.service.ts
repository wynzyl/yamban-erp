import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreatePaymentData, ListQuery, Paginated, UpdatePaymentData } from '@yamban/shared';
import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { customers, orders, payments } from '../db/schema/index.js';

export interface PaymentListRow {
  id: string;
  orderId: string;
  orderNumber: string;
  customerFirstName: string;
  customerLastName: string;
  paymentDate: string;
  amount: string;
  method: string;
  reference: string | null;
  createdAt: Date;
}

export interface PaymentDetailRow {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  paymentDate: string;
  amount: string;
  method: string;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
}

@Injectable()
export class PaymentsService {
  constructor(@InjectDb() private readonly db: Database) {}

  async list(q: ListQuery): Promise<Paginated<PaymentListRow>> {
    const conditions: SQL[] = [];

    if (q.search) {
      const term = `%${q.search.replace(/[%_\\]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(orders.orderNumber, term),
          ilike(customers.firstName, term),
          ilike(customers.lastName, term),
          ilike(payments.reference, term),
        )!,
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, total] = await Promise.all([
      this.db
        .select({
          id: payments.id,
          orderId: payments.orderId,
          orderNumber: orders.orderNumber,
          customerFirstName: customers.firstName,
          customerLastName: customers.lastName,
          paymentDate: payments.paymentDate,
          amount: payments.amount,
          method: payments.method,
          reference: payments.reference,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .innerJoin(orders, eq(orders.id, payments.orderId))
        .innerJoin(customers, eq(customers.id, orders.customerId))
        .where(where)
        .orderBy(desc(payments.paymentDate), desc(payments.createdAt))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      this.db.$count(
        this.db
          .select({ id: payments.id })
          .from(payments)
          .innerJoin(orders, eq(orders.id, payments.orderId))
          .innerJoin(customers, eq(customers.id, orders.customerId))
          .where(where)
          .as('p'),
      ),
    ]);

    return { items: rows, page: q.page, pageSize: q.pageSize, total };
  }

  async get(id: string): Promise<PaymentDetailRow> {
    const [row] = await this.db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        paymentDate: payments.paymentDate,
        amount: payments.amount,
        method: payments.method,
        reference: payments.reference,
        notes: payments.notes,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(eq(payments.id, id))
      .limit(1);

    if (!row) throw new NotFoundException('Payment not found.');
    return row;
  }

  async create(data: CreatePaymentData, userId: string) {
    // Verify order exists
    const [order] = await this.db.select({ id: orders.id }).from(orders).where(eq(orders.id, data.orderId)).limit(1);
    if (!order) throw new NotFoundException('Order not found.');

    const [row] = await this.db
      .insert(payments)
      .values({
        orderId: data.orderId,
        paymentDate: data.paymentDate,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
        recordedById: userId,
      })
      .returning();

    return row!;
  }

  async update(id: string, data: UpdatePaymentData) {
    const updates: Partial<typeof payments.$inferInsert> = {};
    if (data.paymentDate !== undefined) updates.paymentDate = data.paymentDate;
    if (data.amount !== undefined) updates.amount = data.amount;
    if (data.method !== undefined) updates.method = data.method;
    if (data.reference !== undefined) updates.reference = data.reference;
    if (data.notes !== undefined) updates.notes = data.notes;

    const [row] = await this.db.update(payments).set(updates).where(eq(payments.id, id)).returning();
    if (!row) throw new NotFoundException('Payment not found.');
    return row;
  }

  async delete(id: string): Promise<void> {
    const [row] = await this.db.delete(payments).where(eq(payments.id, id)).returning({ id: payments.id });
    if (!row) throw new NotFoundException('Payment not found.');
  }
}
