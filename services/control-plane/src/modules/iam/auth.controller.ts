import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Auth } from '@absolo/contracts';
import { ZodPipe } from '../../common/zod.pipe.js';
import { AuthService } from './auth.service.js';
import { UsersService } from './users.service.js';
import { Public } from './public.decorator.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthenticatedUser } from './types.js';

/**
 * Auth surface — `/v1/auth/*`.
 *
 *   POST /v1/auth/sign-up   — open; creates user, personal org, session.
 *   POST /v1/auth/sign-in   — open; validates password, issues session.
 *   POST /v1/auth/sign-out  — authed; revokes session, clears cookie.
 *   GET  /v1/auth/me        — authed; returns the current user.
 *
 * The session cookie is the only credential — Authorization headers are
 * not accepted from browser clients in Phase 0. Programmatic clients use
 * personal access tokens (Phase 1, plan 04 §pat).
 */
@Controller('/v1/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('sign-up')
  async signUp(
    @Body(new ZodPipe(Auth.SignupRequestSchema)) body: Auth.SignupRequest,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<Auth.Session> {
    return this.auth.signup(body, request, reply);
  }

  @Public()
  @Post('sign-in')
  @HttpCode(200)
  async signIn(
    @Body(new ZodPipe(Auth.LoginRequestSchema)) body: Auth.LoginRequest,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<Auth.Session> {
    return this.auth.login(body, request, reply);
  }

  @Post('sign-out')
  @HttpCode(204)
  async signOut(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.auth.logout(user.sessionId, reply);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<Auth.User> {
    const row = await this.users.getById(user.id);
    return this.auth.toUser(row);
  }
}
