import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateCustomerData, ListQuery, Paginated, UpdateCustomerData } from '@yamban/shared';
import { and, asc, desc, eq, ilike, or, sql, sum, type SQL } from 'drizzle-orm';
import { escapeLikeTerm } from '../common/utils/index.js';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { customers, orders, organizations, payments } from '../db/schema/index.js';

export interface CustomerWithOrdersOption {
  id: string;
  firstName: string;
  lastName: string;
}

export interface OrganizationOption {
  id: string;
  name: string;
  type: string | null;
}

export type CustomerRow = typeof customers.$inferSelect & { organizationName: string | null };

export interface CustomerListRow {
  id: string;
  firstName: string;
  lastName: string;
  organizationName: string | null;
  mobile: string | null;
  municipality: string | null;
  createdAt: Date;
  orderCount: number;
  outstandingBalance: string;
}

export interface CustomerListQuery extends ListQuery {
  sortBy?: 'name' | 'location' | 'createdAt' | 'balance';
  sortOrder?: 'asc' | 'desc';
  municipality?: string;
}

/** Reference resource: copy this module's shape for suppliers, materials, products... */
@Injectable()
export class CustomersService {
  constructor(@InjectDb() private readonly db: Database) {}

  async list(q: CustomerListQuery): Promise<Paginated<CustomerListRow>> {
    const conditions: SQL[] = [eq(customers.active, true)];
    if (q.search) {
      const term = escapeLikeTerm(q.search);
      conditions.push(
        or(
          ilike(customers.firstName, term),
          ilike(customers.lastName, term),
          ilike(customers.mobile, term),
          ilike(organizations.name, term),
        )!,
      );
    }
    if (q.municipality) {
      conditions.push(eq(customers.municipality, q.municipality));
    }
    const where = and(...conditions);

    // Subquery for order stats per customer
    const paidSubquery = this.db
      .select({
        orderId: payments.orderId,
        paidAmount: sum(payments.amount).as('paidAmount'),
      })
      .from(payments)
      .groupBy(payments.orderId)
      .as('paid');

    const orderStatsSubquery = this.db
      .select({
        customerId: orders.customerId,
        orderCount: sql<number>`COUNT(*)::int`.as('orderCount'),
        outstandingBalance: sql<string>`COALESCE(SUM(
          CASE WHEN ${orders.status} NOT IN ('QUOTATION', 'CANCELLED')
          THEN ${orders.total} - COALESCE(${paidSubquery.paidAmount}, 0)
          ELSE 0 END
        ), 0)`.as('outstandingBalance'),
      })
      .from(orders)
      .leftJoin(paidSubquery, eq(paidSubquery.orderId, orders.id))
      .where(sql`${orders.status} NOT IN ('QUOTATION', 'CANCELLED')`)
      .groupBy(orders.customerId)
      .as('orderStats');

    // Determine sort order
    let orderByClause: SQL;
    const sortOrder = q.sortOrder === 'desc' ? desc : asc;
    const oppositeSortOrder = q.sortOrder === 'desc' ? asc : desc;
    switch (q.sortBy) {
      case 'location':
        orderByClause = sql`${sortOrder(customers.municipality)} NULLS LAST, ${asc(customers.lastName)}, ${asc(customers.firstName)}`;
        break;
      case 'createdAt':
        orderByClause = sql`${sortOrder(customers.createdAt)}, ${asc(customers.lastName)}, ${asc(customers.firstName)}`;
        break;
      case 'balance':
        orderByClause = sql`${oppositeSortOrder(orderStatsSubquery.outstandingBalance)} NULLS LAST, ${asc(customers.lastName)}, ${asc(customers.firstName)}`;
        break;
      case 'name':
      default:
        orderByClause = sql`${sortOrder(customers.lastName)}, ${sortOrder(customers.firstName)}`;
        break;
    }

    const [items, total] = await Promise.all([
      this.db
        .select({
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          organizationName: organizations.name,
          mobile: customers.mobile,
          municipality: customers.municipality,
          createdAt: customers.createdAt,
          orderCount: sql<number>`COALESCE(${orderStatsSubquery.orderCount}, 0)`.as('orderCount'),
          outstandingBalance: sql<string>`COALESCE(${orderStatsSubquery.outstandingBalance}, '0')`.as('outstandingBalance'),
        })
        .from(customers)
        .leftJoin(organizations, eq(organizations.id, customers.organizationId))
        .leftJoin(orderStatsSubquery, eq(orderStatsSubquery.customerId, customers.id))
        .where(where)
        .orderBy(orderByClause)
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      this.db
        .$count(
          this.db
            .select({ id: customers.id })
            .from(customers)
            .leftJoin(organizations, eq(organizations.id, customers.organizationId))
            .where(where)
            .as('c'),
        ),
    ]);

    return { items, page: q.page, pageSize: q.pageSize, total };
  }

  /** Get distinct municipalities for filter dropdown. */
  async getMunicipalities(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ municipality: customers.municipality })
      .from(customers)
      .where(and(eq(customers.active, true), sql`${customers.municipality} IS NOT NULL`))
      .orderBy(asc(customers.municipality));
    return rows.map((r) => r.municipality!);
  }

  /** Get all organizations for dropdown. */
  async getOrganizations(): Promise<OrganizationOption[]> {
    const rows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        type: organizations.type,
      })
      .from(organizations)
      .orderBy(asc(organizations.name));
    return rows;
  }

  async get(id: string): Promise<CustomerRow> {
    const [row] = await this.db
      .select({ ...cols, organizationName: organizations.name })
      .from(customers)
      .leftJoin(organizations, eq(organizations.id, customers.organizationId))
      .where(eq(customers.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Customer not found.');
    return row;
  }

  async create(data: CreateCustomerData) {
    const [row] = await this.db.insert(customers).values(data).returning();
    return row!;
  }

  async update(id: string, data: UpdateCustomerData) {
    const [row] = await this.db.update(customers).set(data).where(eq(customers.id, id)).returning();
    if (!row) throw new NotFoundException('Customer not found.');
    return row;
  }

  async delete(id: string): Promise<void> {
    const [row] = await this.db
      .update(customers)
      .set({ active: false })
      .where(eq(customers.id, id))
      .returning({ id: customers.id });
    if (!row) throw new NotFoundException('Customer not found.');
  }

  /** Get customers who have at least one confirmed order (for filter dropdowns). */
  async listWithOrders(): Promise<CustomerWithOrdersOption[]> {
    const rows = await this.db
      .selectDistinct({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
      })
      .from(customers)
      .innerJoin(orders, eq(orders.customerId, customers.id))
      .where(
        and(
          eq(customers.active, true),
          sql`${orders.status} IN ('CONFIRMED', 'IN_PRODUCTION', 'READY', 'RELEASED')`,
        ),
      )
      .orderBy(asc(customers.lastName), asc(customers.firstName));
    return rows;
  }

  /** Get orders for a specific customer (most recent first, limit 20). */
  async getOrders(customerId: string): Promise<CustomerOrderRow[]> {
    // Verify customer exists
    const customer = await this.db.query.customers.findFirst({
      where: eq(customers.id, customerId),
      columns: { id: true },
    });
    if (!customer) throw new NotFoundException('Customer not found.');

    // Subquery for paid amount per order
    const paidSubquery = this.db
      .select({
        orderId: payments.orderId,
        paidAmount: sum(payments.amount).as('paidAmount'),
      })
      .from(payments)
      .groupBy(payments.orderId)
      .as('paid');

    const rows = await this.db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        orderDate: orders.orderDate,
        dueDate: orders.dueDate,
        status: orders.status,
        total: orders.total,
        paidAmount: sql<string>`COALESCE(${paidSubquery.paidAmount}, '0')`.as('paidAmount'),
      })
      .from(orders)
      .leftJoin(paidSubquery, eq(paidSubquery.orderId, orders.id))
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.orderDate), desc(orders.createdAt))
      .limit(20);

    return rows.map((r) => ({
      ...r,
      // Drizzle returns date columns as strings in YYYY-MM-DD format
      orderDate: String(r.orderDate),
      dueDate: r.dueDate ? String(r.dueDate) : null,
    }));
  }

  /** Get account summary for a customer (totals, balances). */
  async getSummary(customerId: string): Promise<CustomerSummary> {
    // Verify customer exists
    const customer = await this.db.query.customers.findFirst({
      where: eq(customers.id, customerId),
      columns: { id: true },
    });
    if (!customer) throw new NotFoundException('Customer not found.');

    // Get order totals (excluding cancelled/quotation)
    const orderStats = await this.db
      .select({
        orderCount: sql<number>`COUNT(*)::int`,
        totalAmount: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.customerId, customerId),
          sql`${orders.status} NOT IN ('QUOTATION', 'CANCELLED')`,
        ),
      );

    // Get total payments
    const paymentStats = await this.db
      .select({
        totalPaid: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(eq(orders.customerId, customerId));

    // Get orders with outstanding balance
    const paidSubquery = this.db
      .select({
        orderId: payments.orderId,
        paidAmount: sum(payments.amount).as('paidAmount'),
      })
      .from(payments)
      .groupBy(payments.orderId)
      .as('paid');

    const unpaidOrders = await this.db
      .select({
        count: sql<number>`COUNT(*)::int`,
        balance: sql<string>`COALESCE(SUM(${orders.total} - COALESCE(${paidSubquery.paidAmount}, 0)), 0)`,
      })
      .from(orders)
      .leftJoin(paidSubquery, eq(paidSubquery.orderId, orders.id))
      .where(
        and(
          eq(orders.customerId, customerId),
          sql`${orders.status} NOT IN ('QUOTATION', 'CANCELLED')`,
          sql`${orders.total} - COALESCE(${paidSubquery.paidAmount}, 0) > 0`,
        ),
      );

    return {
      orderCount: orderStats[0]?.orderCount ?? 0,
      totalSpent: orderStats[0]?.totalAmount ?? '0',
      totalPaid: paymentStats[0]?.totalPaid ?? '0',
      outstandingBalance: unpaidOrders[0]?.balance ?? '0',
      unpaidOrderCount: unpaidOrders[0]?.count ?? 0,
    };
  }
}

export interface CustomerOrderRow {
  id: string;
  orderNumber: string;
  orderDate: string;
  dueDate: string | null;
  status: string;
  total: string;
  paidAmount: string;
}

export interface CustomerSummary {
  orderCount: number;
  totalSpent: string;
  totalPaid: string;
  outstandingBalance: string;
  unpaidOrderCount: number;
}

const cols = {
  id: customers.id,
  firstName: customers.firstName,
  lastName: customers.lastName,
  organizationId: customers.organizationId,
  mobile: customers.mobile,
  email: customers.email,
  facebook: customers.facebook,
  birthday: customers.birthday,
  streetPurok: customers.streetPurok,
  barangay: customers.barangay,
  municipality: customers.municipality,
  province: customers.province,
  notes: customers.notes,
  active: customers.active,
  createdAt: customers.createdAt,
  updatedAt: customers.updatedAt,
};
