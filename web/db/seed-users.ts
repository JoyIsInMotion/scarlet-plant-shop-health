import { db, chunkInsert } from './seed-utils';
import * as schema from '../src/lib/db/schema';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

faker.seed(42);

export async function seedUsers() {
  console.log('👤 Seeding 1,000 users...');
  const SALT = 10;

  const namedUsers = await db.insert(schema.users).values([
    { name: 'Admin',  email: 'admin@scarlet.com', passwordHash: await bcrypt.hash('admin123', SALT), role: 'admin', preferredLocale: 'bg' },
    { name: 'Demo',   email: 'demo@scarlet.com',  passwordHash: await bcrypt.hash('demo123',  SALT), role: 'user',  preferredLocale: 'bg' },
    { name: 'Мария',  email: 'maria@scarlet.com', passwordHash: await bcrypt.hash('pass123',  SALT), role: 'user',  preferredLocale: 'bg' },
    { name: 'Иван',   email: 'ivan@scarlet.com',  passwordHash: await bcrypt.hash('pass123',  SALT), role: 'user',  preferredLocale: 'bg' },
  ]).returning();

  // Hash once, reuse — bcrypt is the bottleneck
  const bulkHash = await bcrypt.hash('user1234', SALT);

  const bulkRows = Array.from({ length: 996 }, (_, i) => ({
    name: faker.person.fullName(),
    email: faker.internet.email({ provider: `scarlet${i + 5}.com` }),
    passwordHash: bulkHash,
    role: 'user' as const,
    preferredLocale: 'bg' as const,
  }));

  await chunkInsert(schema.users, bulkRows, 500);

  const allUsers = await db.select({ id: schema.users.id }).from(schema.users);
  console.log(`   → ${allUsers.length} users`);
  return allUsers;
}

if (require.main === module) {
  seedUsers()
    .then(() => process.exit(0))
    .catch(err => { console.error('❌', err.message); process.exit(1); });
}
