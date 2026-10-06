import { Injectable, NotFoundException } from '@nestjs/common';
import type { ListCostingQuery, OrderStatus, ProductionStage } from '@yamban/shared';
import { PRODUCTION_STAGES } from '@yamban/shared';
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import { escapeLikeTerm, parseDecimal, toFixedDecimal } from '../common/utils/index.js';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import {
  customers,
  defaultLaborRates,
  orderItemLabor,
  orderItemProcesses,
  orderItems,
  orderMaterials,
  orders,
  materials,
  machines,
  productionJobs,
  productStages,
} from '../db/schema/index.js';

export interface ComputedCosts {
  materialCost: number;
  electricityCost: number;
  laborCost: number;
}

export interface LaborLineInput {
  orderItemId: string;
  stage: ProductionStage;
  quantity: number;
  laborRatePerPiece: string;
  totalLaborCost: string;
}

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

export interface LaborCostLine {
  stage: string;
  quantity: number;
  ratePerPiece: string;
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
  laborCosts: LaborCostLine[];
  laborCostTotal: string;
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
      const term = escapeLikeTerm(q.search);
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
      const revenue = parseDecimal(order.revenue);
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

    const rate = order.electricityRate ? parseDecimal(order.electricityRate) : 0;

    // Calculate electricity cost lines
    const electricityCostLines: ElectricityCostLine[] = electricityCosts.map((ec) => {
      const hours = ec.totalMinutes / 60;
      const kwh = hours * parseDecimal(ec.powerKw);
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

    // Get labor costs grouped by stage
    const laborCostsRaw = await this.db
      .select({
        stage: orderItemLabor.stage,
        quantity: sql<number>`SUM(${orderItemLabor.quantity})::int`,
        ratePerPiece: orderItemLabor.laborRatePerPiece,
        totalCost: sql<string>`SUM(${orderItemLabor.totalLaborCost})`,
      })
      .from(orderItemLabor)
      .innerJoin(orderItems, eq(orderItems.id, orderItemLabor.orderItemId))
      .where(eq(orderItems.orderId, orderId))
      .groupBy(orderItemLabor.stage, orderItemLabor.laborRatePerPiece);

    const laborCostLines: LaborCostLine[] = laborCostsRaw.map((lc) => ({
      stage: lc.stage,
      quantity: lc.quantity,
      ratePerPiece: lc.ratePerPiece,
      totalCost: lc.totalCost,
    }));

    // Calculate totals
    const materialCostTotal = materialCosts.reduce((sum, m) => sum + parseDecimal(m.totalCost), 0);
    const electricityCostTotal = electricityCostLines.reduce(
      (sum, e) => sum + parseDecimal(e.totalCost),
      0,
    );
    const laborCostTotal = laborCostLines.reduce((sum, l) => sum + parseDecimal(l.totalCost), 0);
    const totalCost = materialCostTotal + electricityCostTotal + laborCostTotal;
    const revenue = parseDecimal(order.revenue);
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
      laborCosts: laborCostLines,
      laborCostTotal: laborCostTotal.toFixed(2),
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

    const materialCost = parseDecimal(matResult?.total);

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

    const rate = electricityRate ? parseDecimal(electricityRate) : 0;
    let electricityCost = 0;

    for (const p of processData) {
      const hours = p.totalMinutes / 60;
      const kwh = hours * parseDecimal(p.powerKw);
      electricityCost += kwh * rate;
    }

    return { materialCost, electricityCost };
  }

  /**
   * Compute estimated costs at order confirmation.
   * Creates orderItemLabor rows and returns totals for material, electricity, and labor.
   * Called within a transaction; caller should update orders table with returned values.
   */
  async computeEstimatedCosts(
    orderId: string,
    electricityRate: string | null,
    tx: Database,
  ): Promise<{ costs: ComputedCosts; laborLines: LaborLineInput[] }> {
    // Material cost from orderMaterials (already snapshotted)
    const [matResult] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(${orderMaterials.totalCost}), '0')`,
      })
      .from(orderMaterials)
      .innerJoin(orderItems, eq(orderItems.id, orderMaterials.orderItemId))
      .where(eq(orderItems.orderId, orderId));

    const materialCost = parseDecimal(matResult?.total);

    // Electricity cost from orderItemProcesses
    const processData = await tx
      .select({
        powerKw: orderItemProcesses.powerKw,
        totalMinutes: sql<number>`SUM(${orderItemProcesses.minutesPerPiece}::numeric * ${orderItemProcesses.quantity})::float`,
      })
      .from(orderItemProcesses)
      .innerJoin(orderItems, eq(orderItems.id, orderItemProcesses.orderItemId))
      .where(eq(orderItems.orderId, orderId))
      .groupBy(orderItemProcesses.powerKw);

    const rate = electricityRate ? parseDecimal(electricityRate) : 0;
    let electricityCost = 0;

    for (const p of processData) {
      const hours = p.totalMinutes / 60;
      const kwh = hours * parseDecimal(p.powerKw);
      electricityCost += kwh * rate;
    }

    // Labor cost: for each order item, for each stage that product has
    // Get default labor rates as fallback
    const defaultRates = await tx.select().from(defaultLaborRates);
    const defaultRateMap = new Map(defaultRates.map((r) => [r.stage, r.ratePerPiece]));

    // Get order items with their products
    const items = await tx
      .select({
        orderItemId: orderItems.id,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const laborLines: LaborLineInput[] = [];
    let laborCost = 0;

    for (const item of items) {
      // Get product stages with their labor rates
      const stages = await tx
        .select({
          stage: productStages.stage,
          laborRatePerPiece: productStages.laborRatePerPiece,
        })
        .from(productStages)
        .where(eq(productStages.productId, item.productId));

      // If product has no stages defined, use all production stages
      const stageList: { stage: ProductionStage; rate: string }[] = [];
      if (stages.length > 0) {
        for (const s of stages) {
          const rate = s.laborRatePerPiece ?? defaultRateMap.get(s.stage) ?? '0';
          stageList.push({ stage: s.stage, rate });
        }
      } else {
        // No stages defined; use all stages with default rates
        for (const stage of PRODUCTION_STAGES) {
          const rate = defaultRateMap.get(stage) ?? '0';
          stageList.push({ stage, rate });
        }
      }

      // Create labor lines for each stage
      for (const { stage, rate } of stageList) {
        const rateNum = parseDecimal(rate);
        const total = rateNum * item.quantity;
        laborCost += total;

        laborLines.push({
          orderItemId: item.orderItemId,
          stage,
          quantity: item.quantity,
          laborRatePerPiece: rate,
          totalLaborCost: total.toFixed(2),
        });
      }
    }

    return {
      costs: { materialCost, electricityCost, laborCost },
      laborLines,
    };
  }

  /**
   * Compute actual costs when order reaches READY status.
   * Uses actualFabricUsed from HEAT_PRESS job when recorded, else falls back to estimate.
   * Electricity and labor actual equal estimated (no actual time tracking yet).
   */
  async computeActualCosts(
    orderId: string,
    electricityRate: string | null,
    tx: Database,
  ): Promise<ComputedCosts> {
    // Get HEAT_PRESS jobs with actual fabric used
    const heatPressJobs = await tx
      .select({
        orderItemId: productionJobs.orderItemId,
        actualFabricUsed: productionJobs.actualFabricUsed,
      })
      .from(productionJobs)
      .where(
        and(
          eq(productionJobs.orderId, orderId),
          eq(productionJobs.stage, 'HEAT_PRESS'),
        ),
      );

    // Map orderItemId to actual fabric used (if recorded)
    const actualFabricMap = new Map<string, string | null>();
    for (const job of heatPressJobs) {
      if (job.actualFabricUsed) {
        actualFabricMap.set(job.orderItemId, job.actualFabricUsed);
      }
    }

    // Material cost: for fabric materials at HEAT_PRESS stage, use actualFabricUsed if available
    let materialCost = 0;

    // Get all order materials grouped by orderItemId, stage, and material
    const matLines = await tx
      .select({
        orderItemId: orderMaterials.orderItemId,
        materialId: orderMaterials.materialId,
        stage: orderMaterials.stage,
        totalQuantity: orderMaterials.totalQuantity,
        unitCost: orderMaterials.unitCost,
        totalCost: orderMaterials.totalCost,
        category: materials.category,
      })
      .from(orderMaterials)
      .innerJoin(orderItems, eq(orderItems.id, orderMaterials.orderItemId))
      .innerJoin(materials, eq(materials.id, orderMaterials.materialId))
      .where(eq(orderItems.orderId, orderId));

    for (const mat of matLines) {
      // Check if this is a fabric at HEAT_PRESS with actual usage recorded
      if (
        mat.stage === 'HEAT_PRESS' &&
        mat.category === 'FABRIC' &&
        actualFabricMap.has(mat.orderItemId)
      ) {
        const actualQty = parseDecimal(actualFabricMap.get(mat.orderItemId));
        const unitCost = parseDecimal(mat.unitCost);
        materialCost += actualQty * unitCost;
      } else {
        // Use estimated cost
        materialCost += parseDecimal(mat.totalCost);
      }
    }

    // Electricity cost: same as estimated (no actual machine time tracking)
    const processData = await tx
      .select({
        powerKw: orderItemProcesses.powerKw,
        totalMinutes: sql<number>`SUM(${orderItemProcesses.minutesPerPiece}::numeric * ${orderItemProcesses.quantity})::float`,
      })
      .from(orderItemProcesses)
      .innerJoin(orderItems, eq(orderItems.id, orderItemProcesses.orderItemId))
      .where(eq(orderItems.orderId, orderId))
      .groupBy(orderItemProcesses.powerKw);

    const rate = electricityRate ? parseDecimal(electricityRate) : 0;
    let electricityCost = 0;

    for (const p of processData) {
      const hours = p.totalMinutes / 60;
      const kwh = hours * parseDecimal(p.powerKw);
      electricityCost += kwh * rate;
    }

    // Labor cost: same as estimated (sum from orderItemLabor)
    const [laborResult] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(${orderItemLabor.totalLaborCost}), '0')`,
      })
      .from(orderItemLabor)
      .innerJoin(orderItems, eq(orderItems.id, orderItemLabor.orderItemId))
      .where(eq(orderItems.orderId, orderId));

    const laborCost = parseDecimal(laborResult?.total);

    return { materialCost, electricityCost, laborCost };
  }

  /**
   * Get monthly production cost report aggregating estimated vs actual costs
   * for orders confirmed in the given month.
   */
  async getProductionCostReport(month: string): Promise<{
    month: string;
    orderCount: number;
    totalRevenue: string;
    estimated: {
      materialCost: string;
      electricityCost: string;
      laborCost: string;
      total: string;
    };
    actual: {
      materialCost: string;
      electricityCost: string;
      laborCost: string;
      total: string;
    };
    variance: {
      materialCost: string;
      electricityCost: string;
      laborCost: string;
      total: string;
    };
    grossProfit: string;
    grossMarginPercent: string;
  }> {
    // Parse the month to get date range
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split('-').map(Number);
    const nextMonth = monthNum === 12 ? 1 : monthNum! + 1;
    const nextYear = monthNum === 12 ? year! + 1 : year!;
    const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;

    // Get aggregated data for orders confirmed in this month
    const [result] = await this.db
      .select({
        orderCount: sql<number>`count(*)::int`,
        totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), '0')`,
        estMaterialCost: sql<string>`COALESCE(SUM(${orders.estimatedMaterialCost}), '0')`,
        estElectricityCost: sql<string>`COALESCE(SUM(${orders.estimatedElectricityCost}), '0')`,
        estLaborCost: sql<string>`COALESCE(SUM(${orders.estimatedLaborCost}), '0')`,
        actMaterialCost: sql<string>`COALESCE(SUM(${orders.actualMaterialCost}), '0')`,
        actElectricityCost: sql<string>`COALESCE(SUM(${orders.actualElectricityCost}), '0')`,
        actLaborCost: sql<string>`COALESCE(SUM(${orders.actualLaborCost}), '0')`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.confirmedAt, new Date(startDate)),
          lte(orders.confirmedAt, new Date(endDate)),
          sql`${orders.status} != 'CANCELLED'`,
        ),
      );

    const revenue = parseDecimal(result?.totalRevenue);
    const estMat = parseDecimal(result?.estMaterialCost);
    const estElec = parseDecimal(result?.estElectricityCost);
    const estLabor = parseDecimal(result?.estLaborCost);
    const estTotal = estMat + estElec + estLabor;

    const actMat = parseDecimal(result?.actMaterialCost);
    const actElec = parseDecimal(result?.actElectricityCost);
    const actLabor = parseDecimal(result?.actLaborCost);
    const actTotal = actMat + actElec + actLabor;

    const grossProfit = revenue - actTotal;
    const grossMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    return {
      month,
      orderCount: result?.orderCount ?? 0,
      totalRevenue: revenue.toFixed(2),
      estimated: {
        materialCost: estMat.toFixed(2),
        electricityCost: estElec.toFixed(2),
        laborCost: estLabor.toFixed(2),
        total: estTotal.toFixed(2),
      },
      actual: {
        materialCost: actMat.toFixed(2),
        electricityCost: actElec.toFixed(2),
        laborCost: actLabor.toFixed(2),
        total: actTotal.toFixed(2),
      },
      variance: {
        materialCost: (actMat - estMat).toFixed(2),
        electricityCost: (actElec - estElec).toFixed(2),
        laborCost: (actLabor - estLabor).toFixed(2),
        total: (actTotal - estTotal).toFixed(2),
      },
      grossProfit: grossProfit.toFixed(2),
      grossMarginPercent: grossMarginPercent.toFixed(1),
    };
  }
}
