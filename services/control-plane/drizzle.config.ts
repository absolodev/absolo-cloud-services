import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit config for migrations.
 *
 * Schema sources are split per Postgres schema (see plan 28). For now we
 * use a single TS file that declares all of them; as more modules come
 * online we'll split into one file per Postgres schema.
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://absolo:absolo@localhost:5432/absolo',
  },
  schemaFilter: ['iam', 'projects'],
  verbose: true,
  strict: true,
});
