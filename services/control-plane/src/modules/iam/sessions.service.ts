import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DB, type Database } from '../../db/db.module.js';
import { sessions } from '../../db/schema.js';
import { newId } from '../../common/ids.js';
import { APP_CONFIG } from '../../config/config.module.js';
import type { AppConfig } from '../../config/app-config.js';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  sessionCookieOptions,
} from './cookie.js';

interface IssuedSession {
  /** Row identifier — also embedded in the cookie. */
  id: string;
  /** ISO-8601 expiry, mirrored back to the client. */
  expiresAt: Date;
}

/**
 * Server-side opaque sessions.
 *
 * Lifecycle:
 *   1. `issue(userId, …)` creates a row, derives an HMAC of a fresh 256-bit
 *      token, stores only the HMAC, returns `<id>.<token>` for the cookie.
 *   2. `resolve(request)` parses the cookie, looks up the row by id, and
 *      `timingSafeEqual`s the HMAC. Misses, expired and revoked sessions
 *      all return `null` (caller treats as "anonymous").
 *   3. `revoke(id)` stamps `revoked_at`; subsequent resolves miss.
 *
 * Why HMAC, not Argon2? Tokens are 256 bits of `crypto.randomBytes` —
 * already infeasible to guess. We only need integrity + constant-time
 * compare. Argon2 (~50 ms) is reserved for password verification.
 *
 * Plan refs:
 * - `docs/plans/04-iam-rbac-d1e00e.md` §session-management
 * - `docs/plans/26-secrets-management-d1e00e.md`
 */
@Injectable()
export class SessionsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async issue(
    userId: string,
    meta: { userAgent?: string | null; ip?: string | null },
  ): Promise<{ session: IssuedSession; cookieValue: string }> {
    const id = newId('ses');
    const token = randomBytes(32).toString('base64url');
    const refreshTokenHash = this.hmac(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

    await this.db.insert(sessions).values({
      id,
      userId,
      refreshTokenHash,
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
      expiresAt,
      lastSeenAt: now,
      createdAt: now,
    });

    return {
      session: { id, expiresAt },
      cookieValue: `${id}.${token}`,
    };
  }

  async resolve(request: FastifyRequest): Promise<{ sessionId: string; userId: string } | null> {
    const raw = request.cookies?.[SESSION_COOKIE_NAME];
    if (!raw) return null;

    const sep = raw.indexOf('.');
    if (sep <= 0 || sep === raw.length - 1) return null;
    const sessionId = raw.slice(0, sep);
    const presented = raw.slice(sep + 1);

    const [row] = await this.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!row) return null;

    const expected = Buffer.from(row.refreshTokenHash, 'hex');
    const presentedHash = Buffer.from(this.hmac(presented), 'hex');
    if (
      expected.length !== presentedHash.length ||
      !timingSafeEqual(expected, presentedHash)
    ) {
      return null;
    }

    // Best-effort touch — non-blocking would be nicer; for Phase 0 we await
    // since the session lookup is already a round-trip.
    await this.db
      .update(sessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(sessions.id, sessionId));

    return { sessionId: row.id, userId: row.userId };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, sessionId));
  }

  setCookie(reply: FastifyReply, value: string): void {
    reply.setCookie(
      SESSION_COOKIE_NAME,
      value,
      sessionCookieOptions(this.config.NODE_ENV === 'production'),
    );
  }

  clearCookie(reply: FastifyReply): void {
    reply.clearCookie(SESSION_COOKIE_NAME, {
      ...sessionCookieOptions(this.config.NODE_ENV === 'production'),
      maxAge: 0,
    });
  }

  private hmac(input: string): string {
    return createHmac('sha256', this.config.SESSION_SECRET).update(input).digest('hex');
  }
}
