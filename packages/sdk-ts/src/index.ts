/**
 * @absolo/sdk — typed fetch client for the Absolo Cloud REST API.
 *
 * Usage:
 * ```ts
 * import { AbsoloClient } from '@absolo/sdk';
 *
 * const client = new AbsoloClient({
 *   baseUrl: 'https://api.absolo.cloud',
 *   token: process.env.ABSOLO_TOKEN,
 * });
 *
 * const orgs = await client.orgs.list();
 * const proj = await client.projects.create(orgs.data[0].id, {
 *   slug: 'my-app', name: 'My App', kind: 'app',
 * });
 * ```
 */
import { AbsoloHttp, type AbsoloClientOptions } from './http.js';
import { AuthClient } from './clients/auth.js';
import { OrgsClient } from './clients/orgs.js';
import { ProjectsClient } from './clients/projects.js';
import { EnvironmentsClient } from './clients/environments.js';
import { ConfigClient } from './clients/config.js';
import { AppsClient } from './clients/apps.js';
import { BillingClient } from './clients/billing.js';
import { DatabasesClient } from './clients/databases.js';
import { StorageClient } from './clients/storage.js';
import { BindingsClient } from './clients/bindings.js';
import { PlatformClient } from './clients/platform.js';
import { EnterpriseClient } from './clients/enterprise.client.js';

export class AbsoloClient {
  readonly http: AbsoloHttp;
  readonly auth: AuthClient;
  readonly orgs: OrgsClient;
  readonly projects: ProjectsClient;
  readonly environments: EnvironmentsClient;
  readonly config: ConfigClient;
  readonly apps: AppsClient;
  readonly billing: BillingClient;
  readonly databases: DatabasesClient;
  readonly storage: StorageClient;
  readonly bindings: BindingsClient;
  readonly platform: PlatformClient;
  readonly enterprise: EnterpriseClient;

  constructor(options: AbsoloClientOptions = {}) {
    this.http = new AbsoloHttp(options);
    this.auth = new AuthClient(this.http);
    this.orgs = new OrgsClient(this.http);
    this.projects = new ProjectsClient(this.http);
    this.environments = new EnvironmentsClient(this.http);
    this.config = new ConfigClient(this.http);
    this.apps = new AppsClient(this.http);
    this.billing = new BillingClient(this.http);
    this.databases = new DatabasesClient(this.http);
    this.storage = new StorageClient(this.http);
    this.bindings = new BindingsClient(this.http);
    this.platform = new PlatformClient(this.http);
    this.enterprise = new EnterpriseClient(this.http);
  }
}

export type { AbsoloClientOptions, RequestOptions } from './http.js';
export { AbsoloHttp } from './http.js';
export { AbsoloApiError, AbsoloNetworkError } from './errors.js';

// Re-export contract types for convenience so consumers don't have to add
// @absolo/contracts as a separate dependency.
export type * from '@absolo/contracts';
