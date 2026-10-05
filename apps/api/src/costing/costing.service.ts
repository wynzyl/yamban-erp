import { Injectable, NotFoundException } from '@nestjs/common';
import type { ListCostingQuery, OrderStatus } from '@yamban/shared';
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import {
  customers,
  orderItemProcesses,
  orderItems,
  orderMaterials,
  orders,
  materials,
  machines,
} from '../db/schema/index.js';

export interface OrderCostSummary {
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
  revenue: string;
  materialCost: string;
  electricityCost: string;
  totalCost: string;
  profit: string;
  marginPercent: string;
}

export interface MaterialCostLine {
  materialId: string;
  materialName: string;
  materialColor: string | null;
  quantity: string;
  unit: string;
  unitCost: string;
  totalCost: string;
}

export interface ElectricityCostLine {
  machineId: string;
  machineName: string;
  stage: string;
  totalMinutes: number;
  powerKw: string;
  kwh: string;
  rate: string;
  totalCost: string;
}

export interface OrderCostDetail {
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
  electricityRate: string | null;
  revenue: string;
  materialCosts: MaterialCostLine[];
  materialCostTotal: string;
  electricityCosts: ElectricityCostLine[];
  electricityCostTotal: string;
  totalCost: string;
  profit: string;
  marginPercent: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

@Injectable()
export class CostingService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** List orders with cost summary. */
  async listOrderCosts(q: ListCostingQuery): Promise<Paginated<OrderCostSummary>> {
    const conditions: SQL[] = [];

    // Only include orders that are confirmed or later
    conditions.push(
      sql`${orders.status} IN ('CONFIRMED', 'IN_PRODUCTION', 'READY', 'RELEASED')`,
    );

    if (q.status) {
      conditions.push(eq(orders.status, q.status));
    }
    if (q.startDate) {
      conditions.push(gte(orders.orderDate, q.startDate));
    }
    if (q.endDate) {
      conditions.push(lte(orders.orderDate, q.endDate));
    }
    if (q.search) {
      const term = `%${q.search.replace(/[%_\\]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(orders.orderNumber, term),
          ilike(customers.firstName, term),
          ilike(customers.lastName, term),
        )!,
      );
    }

    const where = and(...conditions);
    const limit = q.limit;
    const offset = (q.page - 1) * limit;

    // Get orders with customer info
    const [ordersData, total] = await Promise.all([
      this.db
        .select({
          orderId: orders.id,
          orderNumber: orders.orderNumber,
          firstName: customers.firstName,
          lastName: customers.lastName,
          orderDate: orders.orderDate,
          status: orders.status,
          revenue: orders.total,
          electricityRate: orders.electricityRatePerKwh,
        })
        .from(orders)
        .innerJoin(customers, eq(customers.id, orders.customerId))
        .where(where)
        .orderBy(desc(orders.orderDate))
        .limit(limit)
        .offset(offset),
      this.db.$count(
        this.db
          .select({ id: orders.id })
          .from(orders)
          .innerJoin(customers, eq(customers.id, orders.customerId))
          .where(where)
          .as('o'),
      ),
    ]);

    // Calculate costs for each order
    const items: OrderCostSummary[] = [];
    for (const order of ordersData) {
      const costs = await this.calculateOrderCosts(order.orderId, order.electricityRate);
      const revenue = parseFloat(order.revenue);
      const totalCost = costs.materialCost + costs.electricityCost;
      const profit = revenue - totalCost;
      const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

      items.push({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        customerName: `${order.firstName} ${order.lastName}`.trim(),
        orderDate: order.orderDate,
        status: order.status,
        revenue: order.revenue,
        materialCost: costs.materialCost.toFixed(2),
        electricityCost: costs.electricityCost.toFixed(2),
        totalCost: totalCost.toFixed(2),
        profit: profit.toFixed(2),
        marginPercent: marginPercent.toFixed(1),
      });
    }

    return { items, page: q.page, pageSize: limit, total };
  }

  /** Get detailed cost breakdown for an order. */
  async getOrderCostDetail(orderId: string): Promise<OrderCostDetail> {
    // Get order info
    const [order] = await this.db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        firstName: customers.firstName,
        lastName: customers.lastName,
        orderDate: orders.orderDate,
        status: orders.status,
        revenue: orders.total,
        electricityRate: orders.electricityRatePerKwh,
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) throw new NotFoundException('Order not found.');

    // Get material costs grouped by material
    const materialCosts = await this.db
      .select({
        materialId: orderMaterials.materialId,
        materialName: materials.name,
        materialColor: materials.color,
        unit: orderMaterials.unit,
        unitCost: orderMaterials.unitCost,
        quantity: sql<string>`SUM(${orderMaterials.totalQuantity})`,
        totalCost: sql<string>`SUM(${orderMaterials.totalCost})`,
      })
      .from(orderMaterials)
      .innerJoin(orderItems, eq(orderItems.id, orderMaterials.orderItemId))
      .innerJoin(materials, eq(materials.id, orderMaterials.materialId))
      .where(eq(orderItems.orderId, orderId))
      .groupBy(
        orderMaterials.materialId,
        materials.name,
        materials.color,
        orderMaterials.unit,
        orderMaterials.unitCost,
      );

    // Get electricity costs grouped by machine
    const electricityCosts = await this.db
      .select({
        machineId: orderItemProcesses.machineId,
        machineName: machines.name,
        stage: machines.stage,
        powerKw: orderItemProcesses.powerKw,
        totalMinutes: sql<number>`SUM(${orderItemProcesses.minutesPerPiece}::numeric * ${orderItemProcesses.quantity})::float`,
      })
      .from(orderItemProcesses)
      .innerJoin(orderItems, eq(orderItems.id, orderItemProcesses.orderItemId))
      .innerJoin(machines, eq(machines.id, orderItemProcesses.machineId))
      .where(eq(orderItems.orderId, orderId))
      .groupBy(
        orderItemProcesses.machineId,
        machines.name,
        machines.stage,
        orderItemProcesses.powerKw,
      );

    const rate = order.electricityRate ? parseFloat(order.electricityRate) : 0;

    // Calculate electricity cost lines
    const electricityCostLines: ElectricityCostLine[] = electricityCosts.map((ec) => {
      const hours = ec.totalMinutes / 60;
      const kwh = hours * parseFloat(ec.powerKw);
      const cost = kwh * rate;
      return {
        machineId: ec.machineId,
        machineName: ec.machineName,
        stage: ec.stage,
        totalMinutes: ec.totalMinutes,
        powerKw: ec.powerKw,
        kwh: kwh.toFixed(4),
        rate: order.electricityRate ?? '0',
        totalCost: cost.toFixed(2),
      };
    });

    // Calculate totals
    const materialCostTotal = materialCosts.reduce((sum, m) => sum + parseFloat(m.totalCost), 0);
    const electricityCostTotal = electricityCostLines.reduce(
      (sum, e) => sum + parseFloat(e.totalCost),
      0,
    );
    const totalCost = materialCostTotal + electricityCostTotal;
    const revenue = parseFloat(order.revenue);
    const profit = revenue - totalCost;
    const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      customerName: `${order.firstName} ${order.lastName}`.trim(),
      orderDate: order.orderDate,
      status: order.status,
      electricityRate: order.electricityRate,
      revenue: order.revenue,
      materialCosts: materialCosts.map((m) => ({
        materialId: m.materialId,
        materialName: m.materialName,
        materialColor: m.materialColor,
        quantity: m.quantity,
        unit: m.unit,
        unitCost: m.unitCost,
        totalCost: m.totalCost,
      })),
      materialCostTotal: materialCostTotal.toFixed(2),
      electricityCosts: electricityCostLines,
      electricityCostTotal: electricityCostTotal.toFixed(2),
      totalCost: totalCost.toFixed(2),
      profit: profit.toFixed(2),
      marginPercent: marginPercent.toFixed(1),
    };
  }

  /** Helper: Calculate costs for an order. */
  private async calculateOrderCosts(
    orderId: string,
    electricityRate: string | null,
  ): Promise<{ materialCost: number; electricityCost: number }> {
    // Material cost
    const [matResult] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${orderMaterials.totalCost}), '0')`,
      })
      .from(orderMaterials)
      .innerJoin(orderItems, eq(orderItems.id, orderMaterials.orderItemId))
      .where(eq(orderItems.orderId, orderId));

    const materialCost = parseFloat(matResult?.total ?? '0');

    // Electricity cost
    const processData = await this.db
      .select({
        powerKw: orderItemProcesses.powerKw,
        totalMinutes: sql<number>`SUM(${orderItemProcesses.minutesPerPiece}::numeric * ${orderItemProcesses.quantity})::float`,
      })
      .from(orderItemProcesses)
      .innerJoin(orderItems, eq(orderItems.id, orderItemProcesses.orderItemId))
      .where(eq(orderItems.orderId, orderId))
      .groupBy(orderItemProcesses.powerKw);

    const rate = electricityRate ? parseFloat(electricityRate) : 0;
    let electricityCost = 0;

    for (const p of processData) {
      const hours = p.totalMinutes / 60;
      const kwh = hours * parseFloat(p.powerKw);
      electricityCost += kwh * rate;
    }

    return { materialCost, electricityCost };
  }
}
