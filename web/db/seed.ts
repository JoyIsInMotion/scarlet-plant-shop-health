/**
 * Single seed command (`npm run db:seed`) — idempotent. Reuses existing reusable
 * data and only brings each table up to target:
 *   users 1,000 · species 474 (+category, stale removed) · plants 10,000 (+photos)
 *   schedules 1/plant · care logs 1,000 · products 5,500 (+Pexels images)
 *   orders 1,002 (rebuilt). Safe to run on the current DB or a fresh one.
 */
import { db } from './seed-utils';
import * as schema from '../src/lib/db/schema';
import {
  ensureUsers, reconcileSpecies, ensurePlants, ensureSchedules, ensureCareLogs,
} from './seed-core';
import { seedProducts } from './seed-products';
import { seedOrders } from './seed-orders';

async function main() {
  console.log('\n🌱 Scarlet seed — idempotent (reuses existing data, no full wipe)\n');

  // Optional realistic pools (care notes + addresses); ignored if not generated
  let careNotes: string[] = [];
  let addresses: string[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { REALISTIC_DATA } = require('./realistic-data');
    careNotes = REALISTIC_DATA.careNotes ?? [];
    addresses = REALISTIC_DATA.addresses ?? [];
  } catch { /* fine — falls back to built-in defaults */ }

  await ensureUsers();
  await reconcileSpecies();
  await ensurePlants();
  await ensureSchedules();
  await ensureCareLogs(careNotes);

  // Products: idempotent insert from products-data.ts + fill missing images
  const products = await seedProducts();

  // Orders: reproduced fresh against current products + users
  console.log('🛒 Rebuilding orders...');
  await db.delete(schema.orderItems);
  await db.delete(schema.orders);
  const userIds = (await db.select({ id: schema.users.id }).from(schema.users)).map((u) => u.id);
  await seedOrders(userIds, products, addresses);

  console.log('\n✅ Seed complete.');
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err.message);
  process.exit(1);
});
