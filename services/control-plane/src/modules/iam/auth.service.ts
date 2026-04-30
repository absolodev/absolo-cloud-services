import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Auth } from '@absolo/contracts';
import { APP_CONFIG } from '../../config/config.module.js';
import type { AppConfig } from '../../config/app-config.js';
import { UsersService } from './users.service.js';
import { OrgsService } from './orgs.service.js';
import { SessionsService } from './sessions.service.js';
import type { users as usersTable } from '../../db/schema.js';

type UserRow = typeof usersTable.$inferSelect;

/**
 * Auth orchestrator.
 *
 * The HTTP shapes (`SignupRequest`, `LoginRequest`, `Session`, `User`) come
 * from `@absolo/contracts/auth`. Service methods accept already-validated
 * inputs (the controller runs `ZodPipe` on the body) and return the public
 * `Session` shape so the controller stays thin.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly users: UsersService,
    private readonly orgs: OrgsService,
    private readonly sessions: SessionsService,
  ) {}

  async signup(input: Auth.SignupRequest, request: FastifyRequest, reply: FastifyReply): Promise<Auth.Session> {
    await this.verifyCaptcha(input.captchaToken);

    const user = await this.users.create({
      email: input.email,
      fullName: input.fullName,
      password: input.password,
    });

    // Every new account gets a starter "personal" org so they can create
    // projects without an extra setup step. Plan-36 §4 captures the
    // rationale; full multi-org workflows still go through OrgsModule.
    await this.orgs.createPersonalOrg(user.id, {
      email: user.email,
      fullName: user.fullName,
    });

    const issued = await this.sessions.issue(user.id, this.connectionMeta(request));
    this.sessions.setCookie(reply, issued.cookieValue);
    return this.toSessionPayload(user, issued.session.expiresAt);
  }

  async login(input: Auth.LoginRequest, request: FastifyRequest, reply: FastifyReply): Promise<Auth.Session> {
    const user = await this.users.findByEmail(input.email);
    // Constant-ish-time miss: still hash a fake password so attackers can't
    // probe registered emails by timing the response.
    if (!user) {
      await this.users.verifyPassword(
        '$argon2id$v=19$m=19456,t=2,p=1$bQ4Em5OkjL7Px9TiJyv4uA$JgK3Gk8OqSVaBT2kE/rRQ5sSttx/KsxOM5b7Rx4N4kI',
        input.password,
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.lockedAt) {
      throw new UnauthorizedException('Account locked');
    }

    const ok = await this.users.verifyPassword(user.passwordHash, input.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.mfaEnabled) {
      // MFA enrolment is Phase-1 (plan 04 §mfa); reject until the verifier
      // service exists rather than silently bypass.
      throw new UnauthorizedException('MFA verification not yet implemented');
    }

    const issued = await this.sessions.issue(user.id, this.connectionMeta(request));
    this.sessions.setCookie(reply, issued.cookieValue);
    return this.toSessionPayload(user, issued.session.expiresAt);
  }

  async logout(sessionId: string | null, reply: FastifyReply): Promise<void> {
    if (sessionId) {
      await this.sessions.revoke(sessionId);
    }
    this.sessions.clearCookie(reply);
  }

  toUser(row: UserRow): Auth.User {
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      avatarUrl: row.avatarUrl ?? null,
      mfaEnabled: row.mfaEnabled,
      emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toSessionPayload(row: UserRow, expiresAt: Date): Auth.Session {
    return {
      user: this.toUser(row),
      expiresAt: expiresAt.toISOString(),
      // Scopes are RBAC role-derived in plan 04; for Phase 0 every signed-in
      // user gets their org's default permissions resolved at the route level.
      scopes: [],
    };
  }

  private connectionMeta(request: FastifyRequest): { userAgent: string | null; ip: string | null } {
    const ua = request.headers['user-agent'];
    return {
      userAgent: typeof ua === 'string' ? ua.slice(0, 512) : null,
      ip: request.ip ?? null,
    };
  }

  private async verifyCaptcha(token: string): Promise<void> {
    if (this.config.NODE_ENV === 'production') {
      // TODO(plan-04): wire hCaptcha / Cloudflare Turnstile verification.
      this.logger.warn('captcha verification not implemented in production build');
    }
    if (token.length < 1) {
      throw new UnauthorizedException('Missing captcha token');
    }
  }
}
