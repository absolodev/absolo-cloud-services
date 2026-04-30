import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import type { OpenAPIObject } from 'openapi3-ts/oas31';
import { z } from 'zod';

import { IdSchema, SlugSchema, TimestampSchema, PageMetaSchema } from './common/primitives.js';
import { ApiErrorSchema, ApiErrorIssueSchema } from './errors.js';
import { UserSchema, SessionSchema, LoginRequestSchema, SignupRequestSchema } from './auth/auth.js';
import {
  OrgSchema,
  OrgMemberSchema,
  CreateOrgRequestSchema,
  UpdateOrgRequestSchema,
} from './orgs/orgs.js';
import {
  ProjectSchema,
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
} from './projects/projects.js';
import {
  EnvironmentSchema,
  CreateEnvironmentRequestSchema,
  UpdateEnvironmentRequestSchema,
} from './environments/environments.js';
import {
  ConfigEntrySchema,
  ListConfigEntriesResponseSchema,
  ReplaceConfigRequestSchema,
  PatchConfigRequestSchema,
  ImportConfigRequestSchema,
} from './config/config-entry.js';
import {
  ConfigVersionSchema,
  ConfigDiffSchema,
} from './config/config-version.js';
import { ConfigFileSchema, ReplaceConfigFilesRequestSchema } from './config/config-file.js';

extendZodWithOpenApi(z);

/**
 * Registry of all Absolo API schemas.
 *
 * Paths are registered by the control-plane's controller layer at boot time
 * (it imports this registry and adds its own path entries). The generated
 * `openapi/openapi.gen.yaml` includes only the schemas defined here.
 *
 * See `docs/plans/40-monorepo-structure-d1e00e.md` and
 * `docs/plans/29-api-contracts-d1e00e.md`.
 */
export const registry = new OpenAPIRegistry();

// Common
registry.register('Id', IdSchema);
registry.register('Slug', SlugSchema);
registry.register('Timestamp', TimestampSchema);
registry.register('PageMeta', PageMetaSchema);

// Errors
registry.register('ApiError', ApiErrorSchema);
registry.register('ApiErrorIssue', ApiErrorIssueSchema);

// Auth
registry.register('User', UserSchema);
registry.register('Session', SessionSchema);
registry.register('LoginRequest', LoginRequestSchema);
registry.register('SignupRequest', SignupRequestSchema);

// Orgs
registry.register('Org', OrgSchema);
registry.register('OrgMember', OrgMemberSchema);
registry.register('CreateOrgRequest', CreateOrgRequestSchema);
registry.register('UpdateOrgRequest', UpdateOrgRequestSchema);

// Projects
registry.register('Project', ProjectSchema);
registry.register('CreateProjectRequest', CreateProjectRequestSchema);
registry.register('UpdateProjectRequest', UpdateProjectRequestSchema);

// Environments
registry.register('Environment', EnvironmentSchema);
registry.register('CreateEnvironmentRequest', CreateEnvironmentRequestSchema);
registry.register('UpdateEnvironmentRequest', UpdateEnvironmentRequestSchema);

// Config
registry.register('ConfigEntry', ConfigEntrySchema);
registry.register('ListConfigEntriesResponse', ListConfigEntriesResponseSchema);
registry.register('ReplaceConfigRequest', ReplaceConfigRequestSchema);
registry.register('PatchConfigRequest', PatchConfigRequestSchema);
registry.register('ImportConfigRequest', ImportConfigRequestSchema);
registry.register('ConfigVersion', ConfigVersionSchema);
registry.register('ConfigDiff', ConfigDiffSchema);
registry.register('ConfigFile', ConfigFileSchema);
registry.register('ReplaceConfigFilesRequest', ReplaceConfigFilesRequestSchema);

/** Build the OpenAPI 3.1 document from the shared registry. */
export function buildOpenApiDocument(): OpenAPIObject {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Absolo API',
      version: '0.1.0',
      description:
        'Public REST API for the Absolo Cloud platform. Authored as Zod schemas in `@absolo/contracts`; generated.',
      contact: { name: 'Absolo Engineering', url: 'https://absolo.cloud/contact' },
      license: { name: 'TBD' },
    },
    servers: [
      { url: 'https://api.absolo.cloud', description: 'Production' },
      { url: 'https://api.staging.absolo.cloud', description: 'Staging' },
      { url: 'http://localhost:4000', description: 'Local dev' },
    ],
  });
}
