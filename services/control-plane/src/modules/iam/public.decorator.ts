import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route handler (or a whole controller) as not requiring an
 * authenticated session. The global `AuthGuard` checks this metadata and
 * skips the cookie lookup when present.
 *
 *   @Public()
 *   @Get('healthz')
 *   liveness() { ... }
 */
export const IS_PUBLIC_KEY = 'iam:isPublic';
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
