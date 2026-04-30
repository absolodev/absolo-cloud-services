import { z } from 'zod';

/**
 * Validated runtime configuration. Loaded once at boot from `process.env`.
 *
 * Defaults are dev-only — production config must be supplied explicitly.
 * `26-secrets-management-d1e00e.md` covers how the orchestrator injects these.
 */
const AppConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z
    .string()
    .url()
    .default('postgres://absolo:absolo@localhost:5432/absolo'),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(200).default(10),

  // Auth
  /** Cookie + session signing secret. Must be 32+ chars in production. */
  SESSION_SECRET: z
    .string()
    .min(16)
    .default('dev-only-please-replace-this-with-a-real-secret'),
  /** Allowed origins for CORS — comma-separated. */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5173,http://localhost:5174'),

  // Observability
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  /** Pretty-print logs (only honoured outside production). */
  LOG_PRETTY: z.coerce.boolean().default(true),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = AppConfigSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
