/**
 * Cookie configuration for the session cookie.
 *
 * Wire format: `<sessionId>.<token>` where:
 *   - sessionId is a prefixed-ULID (`ses_…`), used to look up the row.
 *   - token is a 256-bit random secret, base64url-encoded (43 chars).
 *
 * The plaintext token is never stored: the DB has SHA-256(SESSION_SECRET, token)
 * — see `sessions.service.ts`. SHA-256 HMAC is used (not Argon2) because the
 * token is already high-entropy random; we only need integrity + constant-time
 * compare, not password-style brute-force resistance.
 *
 * Cookie attributes:
 *   - `httpOnly`              — JS cannot read it; mitigates XSS exfil.
 *   - `sameSite: 'lax'`       — sufficient for same-site dashboard ↔ api
 *                               (localhost dev + `*.absolo.cloud` prod).
 *   - `secure` in production  — only sent over HTTPS.
 *   - `path: '/'`             — every API route.
 *   - `maxAge: 30 days`       — same as the DB row's `expires_at`.
 */
import type { CookieSerializeOptions } from '@fastify/cookie';

export const SESSION_COOKIE_NAME = 'absolo_session';

/** 30 days in seconds — matches the session row TTL. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export function sessionCookieOptions(isProduction: boolean): CookieSerializeOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}
