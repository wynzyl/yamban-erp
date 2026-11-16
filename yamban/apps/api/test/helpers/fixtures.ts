import { createOrderSchema, type GarmentSize, type ProductionStage } from '@yamban/shared';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Database } from '../../src/db/client.js';
import {
  customers,
  designFiles,
  designJobs,
  inventoryTransactions,
  materials,
  orderMaterials,
  orders,
  payments,
  productionJobs,
  productRecipes,
  products,
  recipeMaterials,
  users,
} from '../../src/db/schema/index.js';
import type { Services } from './services.js';

/**
 * The shop used by the production tests (same recipe as analysis/runtime-checks/scenario.mjs):
 * ink 10 ml @ PRINTING, fabric 1.5 yd @ HEAT_PRESS, thread 20 m @ SEWING, nothing at DESIGN or PACKAGING.
 * Opening stock: fabric 100 yd, ink 1000 ml, thread 5000 m.
 */
export async function seedShop(db: Database, s: Services) {
  const [user] = await db
    .insert(users)
    .values({ email: 'owner@yamban.test', name: 'Test Owner', passwordHash: 'x', role: 'OWNER' })
    .returning();
  const [customer] = await db.insert(customers).values({ firstName: 'Mang', lastName: 'Kanor' }).returning();
  const [product] = await db.insert(products).values({ name: 'Basketball jersey', defaultPrice: '500' }).returning();

  const [fabric, ink, thread] = await db
    .insert(materials)
    .values([
      { name: 'Polydex white', category: 'FABRIC', unit: 'YARD', purchaseUnit: 'ROLL', purchaseQuantity: '78', averageUnitCost: '50' },
      { name: 'Ink cyan', category: 'INK', unit: 'ML', purchaseUnit: 'BOTTLE', purchaseQuantity: '1000', averageUnitCost: '0.05' },
      { name: 'Thread white', category: 'THREAD', unit: 'METER', purchaseUnit: 'CONE', purchaseQuantity: '5000', averageUnitCost: '0.01' },
    ])
    .returning();

  for (const [m, q] of [
    [fabric!, '100'],
    [ink!, '1000'],
    [thread!, '5000'],
  ] as const) {
    await s.inventory.recordTransaction({
      materialId: m.id,
      type: 'ADJUSTMENT',
      quantity: q,
      unitCost: m.averageUnitCost,
      reference: 'opening stock',
    });
  }

  const [recipe] = await db.insert(productRecipes).values({ productId: product!.id }).returning();
  await db.insert(recipeMaterials).values([
    { recipeId: recipe!.id, materialId: ink!.id, quantityPerPiece: '10', stage: 'PRINTING' },
    { recipeId: recipe!.id, materialId: fabric!.id, quantityPerPiece: '1.5', stage: 'HEAT_PRESS' },
    { recipeId: recipe!.id, materialId: thread!.id, quantityPerPiece: '20', stage: 'SEWING' },
  ]);

  return {
    userId: user!.id,
    customerId: customer!.id,
    productId: product!.id,
    materialIds: { fabric: fabric!.id, ink: ink!.id, thread: thread!.id },
  };
}

export type Shop = Awaited<ReturnType<typeof seedShop>>;

type SizeLine = { size: GarmentSize; quantity: number };

/**
 * Creates and confirms an order (confirmation snapshots the recipe and creates the jobs).
 * Default: one item, M × 6 and L × 4 (10 pieces, two order_materials lines per material).
 */
export async function confirmedOrder(
  db: Database,
  s: Services,
  shop: Shop,
  opts: { items?: SizeLine[][]; downPayment?: string } = {},
) {
  const items = opts.items ?? [
    [
      { size: 'M', quantity: 6 },
      { size: 'L', quantity: 4 },
    ],
  ];
  const data = createOrderSchema.parse({
    customerId: shop.customerId,
    items: items.map((sizes) => ({
      productId: shop.productId,
      sizes: sizes.map((l) => ({ ...l, unitPrice: '500' })),
    })),
  });
  const order = await s.orders.create(data, shop.userId);
  await s.orders.update(order.id, { status: 'CONFIRMED' } as never);
  if (opts.downPayment) {
    await db.insert(payments).values({ orderId: order.id, amount: opts.downPayment, method: 'CASH', recordedById: shop.userId });
  }
  return order.id;
}

/** The order's jobs, by order item then sequence. */
export async function jobsOf(db: Database, orderId: string) {
  return db
    .select({
      id: productionJobs.id,
      orderItemId: productionJobs.orderItemId,
      stage: productionJobs.stage,
      sequence: productionJobs.sequence,
      status: productionJobs.status,
      designJobId: designJobs.id,
    })
    .from(productionJobs)
    .leftJoin(designJobs, eq(designJobs.productionJobId, productionJobs.id))
    .where(eq(productionJobs.orderId, orderId))
    .orderBy(asc(productionJobs.orderItemId), asc(productionJobs.sequence));
}

export async function jobAt(db: Database, orderId: string, stage: ProductionStage, itemIndex = 0) {
  const all = await jobsOf(db, orderId);
  const itemIds = [...new Set(all.map((j) => j.orderItemId))];
  const job = all.find((j) => j.orderItemId === itemIds[itemIndex] && j.stage === stage);
  if (!job) throw new Error(`No ${stage} job for item ${itemIndex}`);
  return job;
}

/** Uploads a (fake) final design file so `markReady` accepts the design job. */
export async function attachDesignFile(db: Database, designJobId: string) {
  await db.insert(designFiles).values({
    designJobId,
    fileName: 'design.png',
    storageKey: `test-${designJobId}.png`,
    fileType: 'image/png',
    version: 1,
    isFinal: true,
  });
}

export async function orderRow(db: Database, orderId: string) {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  return o!;
}

export async function stockOnHand(db: Database, materialId: string) {
  const [m] = await db.select({ v: materials.stockOnHand }).from(materials).where(eq(materials.id, materialId));
  return m!.v;
}

/** ORDER_CONSUMPTION ledger rows for one material (optionally one order). */
export async function consumptionRows(db: Database, materialId: string, orderId?: string) {
  return db
    .select({ quantity: inventoryTransactions.quantity, createdById: inventoryTransactions.createdById })
    .from(inventoryTransactions)
    .where(
      and(
        eq(inventoryTransactions.materialId, materialId),
        eq(inventoryTransactions.type, 'ORDER_CONSUMPTION'),
        orderId ? eq(inventoryTransactions.orderId, orderId) : undefined,
      ),
    );
}

/** Sum of ORDER_CONSUMPTION for a material, as numeric text from Postgres (e.g. '-15.000'). */
export async function consumedTotal(db: Database, materialId: string) {
  const [r] = await db
    .select({ total: sql<string>`coalesce(sum(${inventoryTransactions.quantity}), 0)::numeric(14,3)::text` })
    .from(inventoryTransactions)
    .where(and(eq(inventoryTransactions.materialId, materialId), eq(inventoryTransactions.type, 'ORDER_CONSUMPTION')));
  return r!.total;
}

export async function openMaterialLines(db: Database, orderItemId: string) {
  return db.$count(orderMaterials, and(eq(orderMaterials.orderItemId, orderItemId), sql`${orderMaterials.consumedAt} is null`));
}
