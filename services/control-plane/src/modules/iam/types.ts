/**
 * Authentication-related types shared between the guard, controllers and
 * decorators.
 *
 * `AuthenticatedUser` is the minimum shape a route handler can rely on after
 * the global `AuthGuard` has run. We keep it lean — domain-rich lookups
 * (e.g., resolving a user's org memberships) happen on demand in the service
 * layer so the guard stays a single-row select.
 */
export interface AuthenticatedUser {
  /** Prefixed ULID — `usr_…`. */
  id: string;
  email: string;
  fullName: string;
  /** Prefixed ULID of the active session (`ses_…`). */
  sessionId: string;
}

/**
 * Augment `FastifyRequest` so handlers can read `request.user` without
 * unsafe casts. The guard sets it; param decorators read it.
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}
