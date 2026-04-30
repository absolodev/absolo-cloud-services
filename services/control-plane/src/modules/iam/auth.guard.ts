import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { SessionsService } from './sessions.service.js';
import { UsersService } from './users.service.js';

/**
 * Global auth guard.
 *
 * For every request that is *not* marked `@Public()`:
 *   1. Pull the session cookie via `SessionsService.resolve` (constant-time
 *      HMAC compare against the DB-stored hash).
 *   2. Hydrate `request.user` with a minimal `AuthenticatedUser` row.
 *   3. On miss / expired / revoked / hash-mismatch — throw 401, which the
 *      global `ApiErrorFilter` shapes into the contract-conformant envelope.
 *
 * Wired as `APP_GUARD` in `iam.module.ts` so it covers every controller.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionsService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const resolved = await this.sessions.resolve(request);
    if (!resolved) {
      throw new UnauthorizedException('Authentication required');
    }

    const userRow = await this.users.getById(resolved.userId).catch(() => null);
    if (!userRow) {
      throw new UnauthorizedException('Authentication required');
    }

    request.user = {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.fullName,
      sessionId: resolved.sessionId,
    };
    return true;
  }
}
