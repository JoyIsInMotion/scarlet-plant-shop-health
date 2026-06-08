/**
 * Capitalizes the first letter of every commonNameBg in plant_species.
 * Run: npm run db:fix-bg-names
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`
    UPDATE plant_species
    SET common_name_bg = UPPER(LEFT(common_name_bg, 1)) || SUBSTRING(common_name_bg, 2)
    WHERE common_name_bg IS NOT NULL
      AND common_name_bg <> ''
      AND LEFT(common_name_bg, 1) != UPPER(LEFT(common_name_bg, 1))
  `;
  const [{ count }] = await sql`
    SELECT COUNT(*) AS count FROM plant_species WHERE common_name_bg IS NOT NULL
  `;
  console.log(`✅ Done — ${count} total species with BG name`);
}

main().catch((err) => { console.error('❌', err); process.exit(1); });
