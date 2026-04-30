import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import { OrgsService } from './orgs.service.js';
import { SessionsService } from './sessions.service.js';
import { UsersService } from './users.service.js';

/**
 * IAM module — users, sessions, orgs (just the bits auth needs).
 *
 * Marked `@Global()` so the projects module (and every future module) can
 * inject `OrgsService.findMembership` for org-scope checks without each
 * importing IamModule.
 *
 * Registers `AuthGuard` as `APP_GUARD` so every route is authenticated by
 * default. Routes opt out via `@Public()` (see health, sign-up, sign-in).
 */
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    UsersService,
    OrgsService,
    SessionsService,
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [UsersService, OrgsService, SessionsService, AuthService],
})
export class IamModule {}
