import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { APP_FILTER } from '@nestjs/core';
import fastifyCookie from '@fastify/cookie';
import postgres from 'postgres';

import { ConfigModule } from '../src/config/config.module.js';
import { DatabaseModule } from '../src/db/db.module.js';
import { IamModule } from '../src/modules/iam/iam.module.js';
import { ProjectsModule } from '../src/modules/projects/projects.module.js';
import { ApiErrorFilter } from '../src/common/api-error.filter.js';
import { loadAppConfig } from '../src/config/app-config.js';

/**
 * Integration test for the full auth slice + org-scoped projects.
 *
 * Hits the real local Postgres — `docker compose up -d` first. We use a
 * random email per test run so re-runs don't collide; the test cleans up
 * after itself by deleting the user (FK cascades remove org / membership
 * / sessions / projects).
 *
 * Why not mock Postgres? The interesting bug surface here lives in:
 *   - Drizzle ↔ Postgres FK + unique constraint behaviour (signup race).
 *   - `@fastify/cookie` interaction with the auth guard.
 *   - Casting between contract types and DB rows.
 * A pg-mem mock would hide all three.
 */
describe('auth flow', () => {
  let app: NestFastifyApplication;
  const email = `test+${Date.now()}.${Math.floor(Math.random() * 1e6)}@absolo.local`;
  const password = 'correcthorsebatterystaple';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule, DatabaseModule, IamModule, ProjectsModule],
      providers: [{ provide: APP_FILTER, useClass: ApiErrorFilter }],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    const config = loadAppConfig();
    await app.register(fastifyCookie, { secret: config.SESSION_SECRET });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 30_000);

  afterAll(async () => {
    if (app) {
      // Direct DB cleanup using the same DATABASE_URL.
      const config = loadAppConfig();
      const sql = postgres(config.DATABASE_URL, { max: 1 });
      try {
        await sql`delete from iam.users where email = ${email}`;
      } finally {
        await sql.end({ timeout: 5 });
      }
      await app.close();
    }
  });

  it('rejects anonymous calls to authed routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/auth/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
      status: 401,
    });
  });

  it('signs up, returns a session, sets the cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-up',
      payload: {
        email,
        password,
        fullName: 'Test User',
        captchaToken: 'dev',
        marketingOptIn: false,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { user: { email: string; id: string }; expiresAt: string };
    expect(body.user.email).toBe(email);
    expect(body.user.id).toMatch(/^usr_[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(res.cookies.find((c) => c.name === 'absolo_session')?.value).toBeTruthy();
  });

  it('rejects duplicate signup', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-up',
      payload: {
        email,
        password,
        fullName: 'Test User',
        captchaToken: 'dev',
        marketingOptIn: false,
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it('signs in with correct credentials and rejects bad ones', async () => {
    const ok = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in',
      payload: { email, password },
    });
    expect(ok.statusCode).toBe(200);

    const bad = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in',
      payload: { email, password: 'wrongwrongwrong1' },
    });
    expect(bad.statusCode).toBe(401);
  });

  it('returns the user from /v1/auth/me with cookie', async () => {
    const signin = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in',
      payload: { email, password },
    });
    const cookie = signin.cookies.find((c) => c.name === 'absolo_session')!;
    const me = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      cookies: { absolo_session: cookie.value },
    });
    expect(me.statusCode).toBe(200);
    expect((me.json() as { email: string }).email).toBe(email);
  });

  it('scopes projects to caller orgs (403 on foreign org, 200 on own)', async () => {
    const signin = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in',
      payload: { email, password },
    });
    const cookie = signin.cookies.find((c) => c.name === 'absolo_session')!;
    const userId = (signin.json() as { user: { id: string } }).user.id;

    // Foreign org → 403 (caller is not a member).
    const foreign = await app.inject({
      method: 'GET',
      url: '/v1/orgs/org_01HZX9DEMO0000000000000000/projects',
      cookies: { absolo_session: cookie.value },
    });
    expect(foreign.statusCode).toBe(403);

    // Own org via direct DB lookup.
    const config = loadAppConfig();
    const sql = postgres(config.DATABASE_URL, { max: 1 });
    let ownOrgId: string;
    try {
      const rows = await sql<{ org_id: string }[]>`
        select org_id from iam.memberships where user_id = ${userId} limit 1
      `;
      ownOrgId = rows[0]!.org_id;
    } finally {
      await sql.end({ timeout: 5 });
    }

    const own = await app.inject({
      method: 'GET',
      url: `/v1/orgs/${ownOrgId}/projects`,
      cookies: { absolo_session: cookie.value },
    });
    expect(own.statusCode).toBe(200);
    expect((own.json() as { data: unknown[] }).data).toEqual([]);
  });

  it('signs out and revokes the session server-side', async () => {
    const signin = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in',
      payload: { email, password },
    });
    const cookie = signin.cookies.find((c) => c.name === 'absolo_session')!;

    const signout = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-out',
      cookies: { absolo_session: cookie.value },
    });
    expect(signout.statusCode).toBe(204);

    // Same cookie value, server-side row now revoked → 401.
    const me = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      cookies: { absolo_session: cookie.value },
    });
    expect(me.statusCode).toBe(401);
  });
});
