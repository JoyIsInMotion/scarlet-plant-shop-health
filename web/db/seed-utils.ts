import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/lib/db/schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

export async function chunkInsert<T extends Record<string, unknown>>(
  table: Parameters<typeof db.insert>[0],
  rows: T[],
  size = 500,
): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size) as T[]);
  }
}
