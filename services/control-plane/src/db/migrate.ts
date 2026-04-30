/**
 * Apply pending Drizzle migrations and exit.
 * Invoked from `pnpm --filter @absolo/control-plane db:migrate`.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { loadAppConfig } from '../config/app-config.js';

async function main() {
  const config = loadAppConfig();
  const client = postgres(config.DATABASE_URL, { max: 1 });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: './drizzle' });
  await client.end({ timeout: 5 });
  console.log('✓ migrations applied');
}

main().catch((err) => {
  console.error('migration failed:', err);
  process.exit(1);
});
