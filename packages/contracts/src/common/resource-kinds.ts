import { z } from 'zod';

/**
 * Resource ID prefixes used across Absolo.
 *
 * Keep this list in sync with the Drizzle table definitions in the control plane.
 * The prefix is part of the public ID format (see `IdSchema`).
 */
export const RESOURCE_PREFIXES = {
  user: 'usr',
  org: 'org',
  orgMember: 'om',
  project: 'prj',
  app: 'app',
  site: 'site',
  environment: 'env',
  deployment: 'dep',
  build: 'bld',
  domain: 'dom',
  configEntry: 'cfg',
  configVersion: 'cfv',
  apiToken: 'tok',
  invite: 'inv',
  session: 'ses',
  webhook: 'whk',
} as const;

export type ResourceKind = keyof typeof RESOURCE_PREFIXES;
export type ResourcePrefix = (typeof RESOURCE_PREFIXES)[ResourceKind];

/**
 * Type-safe ID for a specific resource kind. Pure compile-time refinement.
 */
export type IdOf<K extends ResourceKind> = string & { __kind: K };

export const idOf = <K extends ResourceKind>(kind: K) =>
  z
    .string()
    .regex(new RegExp(`^${RESOURCE_PREFIXES[kind]}_[0-9A-HJKMNP-TV-Z]{26}$`))
    .transform((s) => s as IdOf<K>);
