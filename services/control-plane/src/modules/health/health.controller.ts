import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB, type Database } from '../../db/db.module.js';

/**
 * Liveness + readiness for the control plane.
 *
 * - `GET /healthz`  — liveness (process is up). Always 200 unless the event
 *                     loop is wedged.
 * - `GET /readyz`   — readiness (DB reachable). 503 if the DB ping fails.
 *
 * These are *unauthenticated* and excluded from rate limiting. The orchestrator
 * relies on them for restart/replace decisions.
 */
@Controller()
export class HealthController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Get('healthz')
  liveness() {
    return { status: 'ok', uptimeSeconds: Math.floor(process.uptime()) };
  }

  @Get('readyz')
  async readiness() {
    const startedAt = Date.now();
    await this.db.execute(sql`select 1`);
    return {
      status: 'ok',
      checks: {
        database: { status: 'ok', latencyMs: Date.now() - startedAt },
      },
    };
  }
}
