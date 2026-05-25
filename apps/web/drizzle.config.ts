import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default {
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: true,
  },
} satisfies Config;
