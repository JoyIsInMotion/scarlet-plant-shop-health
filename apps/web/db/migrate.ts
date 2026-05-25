import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('✅ Connected to Neon');

  const sql = readFileSync(
    join(__dirname, '../src/lib/db/migrations/0000_sharp_kid_colt.sql'),
    'utf8'
  );

  // drizzle-kit uses --> statement-breakpoint to split statements
  const statements = sql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(Boolean);

  console.log(`Running ${statements.length} statements...`);
  for (let i = 0; i < statements.length; i++) {
    try {
      await client.query(statements[i]);
      console.log(`  [${i + 1}/${statements.length}] ✅`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already exists')) {
        console.log(`  [${i + 1}/${statements.length}] ⚠️  already exists — skipping`);
      } else {
        console.error(`  [${i + 1}/${statements.length}] ❌ ${msg}`);
        await client.end();
        process.exit(1);
      }
    }
  }

  await client.end();
  console.log('\n✅ Migration complete');
  process.exit(0);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
