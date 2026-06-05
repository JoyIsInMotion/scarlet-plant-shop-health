import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const result = await db.delete(schema.aiAnalyses).returning({ id: schema.aiAnalyses.id });
  console.log(`✅ Cleared ${result.length} AI analyses`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
