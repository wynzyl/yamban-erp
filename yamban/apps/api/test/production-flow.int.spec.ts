import { HttpException } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../src/db/client.js';
import { openTestDb, resetDb } from './helpers/db.js';
import {
  attachDesignFile,
  confirmedOrder,
  consumedTotal,
  consumptionRows,
  jobAt,
  jobsOf,
  openMaterialLines,
  orderRow,
  seedShop,
  stockOnHand,
  type Shop,
} from './helpers/fixtures.js';
import { buildServices, type Services } from './helpers/services.js';

let db: Database;
let close: () => Promise<void>;
let s: Services;
let shop: Shop;

beforeAll(() => {
  ({ db, close } = openTestDb());
  s = buildServices(db);
});
afterAll(() => close());
beforeEach(async () => {
  await resetDb(db);
  shop = await seedShop(db, s);
});

/** Asserts the promise rejects with an HttpException of this status (and machine-readable code). */
async function expectHttpError(p: Promise<unknown>, status: number, code?: string) {
  const err = await p.then(
    () => {
      throw new Error(`expected HTTP ${status}${code ? ` ${code}` : ''}, but the call succeeded`);
    },
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(HttpException);
  const http = err as HttpException;
  expect(http.getStatus()).toBe(status);
  if (code) expect((http.getResponse() as { code?: string }).code).toBe(code);
  return http;
}

/** Design ready, then complete every later stage of one item through the production endpoints. */
async function finishItem(orderId: string, itemIndex = 0) {
  const design = await jobAt(db, orderId, 'DESIGN', itemIndex);
  await attachDesignFile(db, design.designJobId!);
  await s.design.markReady(design.designJobId!, shop.userId);
  for (const stage of ['PRINTING', 'HEAT_PRESS', 'SEWING', 'PACKAGING'] as const) {
    const job = await jobAt(db, orderId, stage, itemIndex);
    await s.production.completeJob(job.id, shop.userId);
  }
}

describe('production flow: stock consumption', () => {
  it('completing every stage deducts each recipe material exactly once', async () => {
    const orderId = await confirmedOrder(db, s, shop, { downPayment: '1000' });
    await finishItem(orderId);

    // 10 pieces: ink 100 ml, fabric 15 yd, thread 200 m. Two size lines each (M × 6, L × 4).
    expect(await consumedTotal(db, shop.materialIds.ink)).toBe('-100.000');
    expect(await consumedTotal(db, shop.materialIds.fabric)).toBe('-15.000');
    expect(await consumedTotal(db, shop.materialIds.thread)).toBe('-200.000');
    for (const id of Object.values(shop.materialIds)) {
      expect(await consumptionRows(db, id, orderId)).toHaveLength(2);
    }
    expect(await stockOnHand(db, shop.materialIds.ink)).toBe('900.000');
    expect(await stockOnHand(db, shop.materialIds.fabric)).toBe('85.000');
    expect(await stockOnHand(db, shop.materialIds.thread)).toBe('4800.000');

    const item = await jobAt(db, orderId, 'DESIGN');
    expect(await openMaterialLines(db, item.orderItemId)).toBe(0);

    // Completing the last job again changes nothing.
    await s.production.completeJob((await jobAt(db, orderId, 'PACKAGING')).id, shop.userId);
    expect(await consumedTotal(db, shop.materialIds.thread)).toBe('-200.000');
  });

  it('records who started the stage on the consumption rows', async () => {
    const orderId = await confirmedOrder(db, s, shop, { downPayment: '1000' });
    await finishItem(orderId);
    const rows = await consumptionRows(db, shop.materialIds.fabric, orderId);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.createdById === shop.userId)).toBe(true);
  });

  it('completing a stage starts the next one through the start path (consumption included)', async () => {
    const orderId = await confirmedOrder(db, s, shop, { downPayment: '1000' });
    const design = await jobAt(db, orderId, 'DESIGN');
    await attachDesignFile(db, design.designJobId!);
    await s.design.markReady(design.designJobId!, shop.userId);
    await s.production.completeJob((await jobAt(db, orderId, 'PRINTING')).id, shop.userId);

    expect((await jobAt(db, orderId, 'HEAT_PRESS')).status).toBe('IN_PROGRESS');
    expect(await consumedTotal(db, shop.materialIds.fabric)).toBe('-15.000');
    expect((await jobAt(db, orderId, 'SEWING')).status).toBe('PENDING');
    expect(await consumedTotal(db, shop.materialIds.thread)).toBe('0.000');
  });
});

describe('production flow: design ready and the down-payment gate', () => {
  it('with a down payment, design ready starts Printing and deducts its ink', async () => {
    const orderId = await confirmedOrder(db, s, shop, { downPayment: '1000' });
    const design = await jobAt(db, orderId, 'DESIGN');
    await attachDesignFile(db, design.designJobId!);
    await s.design.markReady(design.designJobId!, shop.userId);

    expect((await jobAt(db, orderId, 'DESIGN')).status).toBe('COMPLETED');
    expect((await jobAt(db, orderId, 'PRINTING')).status).toBe('IN_PROGRESS');
    expect(await consumedTotal(db, shop.materialIds.ink)).toBe('-100.000');
  });

  it('without a down payment, Printing waits and asks for acknowledgement', async () => {
    const orderId = await confirmedOrder(db, s, shop);
    const design = await jobAt(db, orderId, 'DESIGN');
    await attachDesignFile(db, design.designJobId!);
    await s.design.markReady(design.designJobId!, shop.userId);

    const printing = await jobAt(db, orderId, 'PRINTING');
    expect(printing.status).toBe('PENDING');
    expect(await consumedTotal(db, shop.materialIds.ink)).toBe('0.000');

    const err = await expectHttpError(s.production.startJob(printing.id, {}, shop.userId), 409, 'DOWN_PAYMENT_REQUIRED');
    expect((err.getResponse() as { message: string }).message).toBe('No down payment recorded.');
    expect((await jobAt(db, orderId, 'PRINTING')).status).toBe('PENDING');

    await s.production.startJob(printing.id, { acknowledgeNoPayment: true }, shop.userId);
    expect((await jobAt(db, orderId, 'PRINTING')).status).toBe('IN_PROGRESS');
    expect(await consumedTotal(db, shop.materialIds.ink)).toBe('-100.000');
  });

  it('design ready works when the design job was started first', async () => {
    const orderId = await confirmedOrder(db, s, shop, { downPayment: '1000' });
    const design = await jobAt(db, orderId, 'DESIGN');
    await s.production.startJob(design.id, {}, shop.userId);
    await attachDesignFile(db, design.designJobId!);
    await s.design.markReady(design.designJobId!, shop.userId);
    expect((await jobAt(db, orderId, 'PRINTING')).status).toBe('IN_PROGRESS');
  });
});

describe('production flow: stage order and job status', () => {
  it('a PENDING job cannot be completed', async () => {
    const orderId = await confirmedOrder(db, s, shop, { downPayment: '1000' });
    const heatPress = await jobAt(db, orderId, 'HEAT_PRESS');
    await expectHttpError(s.production.completeJob(heatPress.id, shop.userId), 409, 'JOB_NOT_IN_PROGRESS');
    expect((await jobAt(db, orderId, 'HEAT_PRESS')).status).toBe('PENDING');
    expect((await jobAt(db, orderId, 'SEWING')).status).toBe('PENDING');
  });

  it('a job cannot start before the previous stage is completed', async () => {
    const orderId = await confirmedOrder(db, s, shop, { downPayment: '1000' });
    const heatPress = await jobAt(db, orderId, 'HEAT_PRESS');
    await expectHttpError(s.production.startJob(heatPress.id, {}, shop.userId), 409, 'PREVIOUS_STAGE_OPEN');
    expect((await jobAt(db, orderId, 'HEAT_PRESS')).status).toBe('PENDING');
    expect(await consumedTotal(db, shop.materialIds.fabric)).toBe('0.000');
  });

  it('a job that is already in progress cannot be started again', async () => {
    const orderId = await confirmedOrder(db, s, shop, { downPayment: '1000' });
    const design = await jobAt(db, orderId, 'DESIGN');
    await s.production.startJob(design.id, {}, shop.userId);
    await expectHttpError(s.production.startJob(design.id, {}, shop.userId), 409, 'JOB_NOT_PENDING');
  });

  it('an unknown job is a 404', async () => {
    await expectHttpError(
      s.production.startJob('00000000-0000-4000-8000-000000000000', {}, shop.userId),
      404,
    );
  });
});

describe('production flow: order status', () => {
  it('the order moves to IN_PRODUCTION when its first job starts', async () => {
    const orderId = await confirmedOrder(db, s, shop, { downPayment: '1000' });
    expect((await orderRow(db, orderId)).status).toBe('CONFIRMED');
    await s.production.startJob((await jobAt(db, orderId, 'DESIGN')).id, {}, shop.userId);
    expect((await orderRow(db, orderId)).status).toBe('IN_PRODUCTION');
  });

  it('design ready on an untouched order also moves it to IN_PRODUCTION', async () => {
    const orderId = await confirmedOrder(db, s, shop);
    const design = await jobAt(db, orderId, 'DESIGN');
    await attachDesignFile(db, design.designJobId!);
    await s.design.markReady(design.designJobId!, shop.userId);
    expect((await orderRow(db, orderId)).status).toBe('IN_PRODUCTION');
  });

  it('the order becomes READY, with actual costs, when its last job completes', async () => {
    const orderId = await confirmedOrder(db, s, shop, { downPayment: '1000' });
    const design = await jobAt(db, orderId, 'DESIGN');
    await attachDesignFile(db, design.designJobId!);
    await s.design.markReady(design.designJobId!, shop.userId);
    for (const stage of ['PRINTING', 'HEAT_PRESS', 'SEWING'] as const) {
      await s.production.completeJob((await jobAt(db, orderId, stage)).id, shop.userId);
    }
    let order = await orderRow(db, orderId);
    expect(order.status).toBe('IN_PRODUCTION');
    expect(order.actualMaterialCost).toBeNull();

    await s.production.completeJob((await jobAt(db, orderId, 'PACKAGING')).id, shop.userId);
    order = await orderRow(db, orderId);
    expect(order.status).toBe('READY');
    // fabric 15 yd × 50 + ink 100 ml × 0.05 + thread 200 m × 0.01
    expect(order.actualMaterialCost).toBe('757.00');
    expect(order.actualElectricityCost).not.toBeNull();
    expect(order.actualLaborCost).not.toBeNull();
  });

  it('a two-item order stays IN_PRODUCTION until both items are packaged', async () => {
    const orderId = await confirmedOrder(db, s, shop, {
      downPayment: '1000',
      items: [[{ size: 'M', quantity: 2 }], [{ size: 'L', quantity: 3 }]],
    });
    await finishItem(orderId, 0);
    expect((await orderRow(db, orderId)).status).toBe('IN_PRODUCTION');
    await finishItem(orderId, 1);
    expect((await orderRow(db, orderId)).status).toBe('READY');
    expect((await jobsOf(db, orderId)).every((j) => j.status === 'COMPLETED')).toBe(true);
  });
});

describe('production flow: concurrency', () => {
  it('5 concurrent starts of one job give exactly one success and one deduction', async () => {
    const orderId = await confirmedOrder(db, s, shop); // no payment: Printing waits after design ready
    const design = await jobAt(db, orderId, 'DESIGN');
    await attachDesignFile(db, design.designJobId!);
    await s.design.markReady(design.designJobId!, shop.userId);
    const printing = await jobAt(db, orderId, 'PRINTING');

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        s.production.startJob(printing.id, { acknowledgeNoPayment: true }, shop.userId),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected).toHaveLength(4);
    for (const r of rejected) {
      expect(r.reason).toBeInstanceOf(HttpException);
      expect((r.reason as HttpException).getStatus()).toBe(409);
      expect(((r.reason as HttpException).getResponse() as { code?: string }).code).toBe('JOB_NOT_PENDING');
    }
    expect(await consumptionRows(db, shop.materialIds.ink, orderId)).toHaveLength(2);
    expect(await stockOnHand(db, shop.materialIds.ink)).toBe('900.000');
  });

  it('5 concurrent completes of one job complete it once and start the next stage once', async () => {
    const orderId = await confirmedOrder(db, s, shop, { downPayment: '1000' });
    const design = await jobAt(db, orderId, 'DESIGN');
    await attachDesignFile(db, design.designJobId!);
    await s.design.markReady(design.designJobId!, shop.userId);
    const printing = await jobAt(db, orderId, 'PRINTING');

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => s.production.completeJob(printing.id, shop.userId)),
    );
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true); // completing twice is a no-op
    expect(await consumptionRows(db, shop.materialIds.fabric, orderId)).toHaveLength(2);
    expect(await stockOnHand(db, shop.materialIds.fabric)).toBe('85.000');
  });
});
