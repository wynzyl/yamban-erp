/**
 * Creates the first OWNER account (there is no public sign-up) and the
 * reference rows the spec uses in its examples. Safe to run more than once.
 *
 *   pnpm db:seed
 */
import { hash } from '@node-rs/argon2';
import { sql } from 'drizzle-orm';
import { env } from '../config/env.js';
import { createDb, createPool } from './client.js';
import { customers, electricityRates, machines, organizations, products, productSizes, users } from './schema/index.js';

const pool = createPool(env.DATABASE_URL);
const db = createDb(pool);

async function main(): Promise<void> {
  const email = (process.env.SEED_OWNER_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD ?? '';
  const name = process.env.SEED_OWNER_NAME ?? 'Shop Owner';
  if (!email || password.length < 10) {
    throw new Error('Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD (10+ characters) in .env');
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`);
  if (existing.length === 0) {
    await db.insert(users).values({ email, name, role: 'OWNER', passwordHash: await hash(password) });
    console.log(`Owner account created: ${email}`);
  } else {
    console.log(`Owner account already exists: ${email}`);
  }

  const machineCount = await db.$count(machines);
  if (machineCount === 0) {
    // Example figures from the MVP spec §29. Replace with the shop's real ratings.
    await db.insert(machines).values([
      { name: 'Sublimation printer', stage: 'PRINTING', powerKw: '0.150' },
      { name: 'Heat press', stage: 'HEAT_PRESS', powerKw: '6.000' },
      { name: 'Sewing machine', stage: 'SEWING', powerKw: '0.400' },
    ]);
    await db
      .insert(electricityRates)
      .values({ ratePerKwh: '12.0000', effectiveDate: '2026-01-01' })
      .onConflictDoNothing();
    console.log('Seeded machines and an example electricity rate (₱12.00/kWh).');
  }

  // Seed sample organizations
  const orgCount = await db.$count(organizations);
  if (orgCount === 0) {
    await db.insert(organizations).values([
      { name: 'San Jose Elementary School', type: 'school' },
      { name: 'Barangay Poblacion Basketball Team', type: 'team' },
      { name: 'St. Augustine Parish', type: 'parish' },
    ]);
    console.log('Seeded sample organizations.');
  }

  // Seed sample customers
  const customerCount = await db.$count(customers);
  console.log(`Current customer count: ${customerCount}`);
  if (customerCount === 0) {
    const [org1] = await db.select({ id: organizations.id }).from(organizations).limit(1);
    await db.insert(customers).values([
      { firstName: 'Juan', lastName: 'Dela Cruz', mobile: '+639171234567', municipality: 'San Jose' },
      { firstName: 'Maria', lastName: 'Santos', mobile: '+639179876543', municipality: 'Poblacion', organizationId: org1?.id },
      { firstName: 'Pedro', lastName: 'Reyes', mobile: '+639181112222', municipality: 'Tagbilaran' },
      { firstName: 'Ana', lastName: 'Garcia', mobile: '+639192223333', municipality: 'Dauis' },
    ]);
    console.log('Seeded sample customers.');
  }

  // Seed sample products
  const productCount = await db.$count(products);
  if (productCount === 0) {
    const [jersey] = await db.insert(products).values([
      { name: 'Basketball Jersey', description: 'Full sublimation basketball jersey' },
    ]).returning();
    const [shorts] = await db.insert(products).values([
      { name: 'Basketball Shorts', description: 'Full sublimation basketball shorts' },
    ]).returning();
    const [tshirt] = await db.insert(products).values([
      { name: 'T-Shirt', description: 'Round neck sublimation t-shirt' },
    ]).returning();

    // Add sizes with default prices
    if (jersey) {
      await db.insert(productSizes).values([
        { productId: jersey.id, size: 'XS', defaultPrice: '350.00' },
        { productId: jersey.id, size: 'S', defaultPrice: '350.00' },
        { productId: jersey.id, size: 'M', defaultPrice: '400.00' },
        { productId: jersey.id, size: 'L', defaultPrice: '400.00' },
        { productId: jersey.id, size: 'XL', defaultPrice: '450.00' },
        { productId: jersey.id, size: '2XL', defaultPrice: '500.00' },
        { productId: jersey.id, size: '3XL', defaultPrice: '550.00' },
      ]);
    }
    if (shorts) {
      await db.insert(productSizes).values([
        { productId: shorts.id, size: 'S', defaultPrice: '300.00' },
        { productId: shorts.id, size: 'M', defaultPrice: '350.00' },
        { productId: shorts.id, size: 'L', defaultPrice: '350.00' },
        { productId: shorts.id, size: 'XL', defaultPrice: '400.00' },
        { productId: shorts.id, size: '2XL', defaultPrice: '450.00' },
      ]);
    }
    if (tshirt) {
      await db.insert(productSizes).values([
        { productId: tshirt.id, size: 'S', defaultPrice: '250.00' },
        { productId: tshirt.id, size: 'M', defaultPrice: '280.00' },
        { productId: tshirt.id, size: 'L', defaultPrice: '280.00' },
        { productId: tshirt.id, size: 'XL', defaultPrice: '320.00' },
        { productId: tshirt.id, size: '2XL', defaultPrice: '350.00' },
      ]);
    }
    console.log('Seeded sample products with sizes.');
  }
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
