import type { AbsoloHttp } from '../http.js';
import type { Id } from '@absolo/contracts/common';
import type {
  ConfigDiff,
  ConfigVersion,
  ImportConfigRequest,
  ListConfigEntriesQuery,
  ListConfigEntriesResponse,
  PatchConfigRequest,
  ReplaceConfigRequest,
} from '@absolo/contracts/config';

/**
 * Client for the configuration / environment-variables surface
 * (see `docs/plans/41-application-configuration-d1e00e.md`).
 *
 * Reading secrets in plaintext requires `reveal: true` AND the caller having
 * `config.secret.read`. Without that scope, the server returns masked values
 * regardless of `reveal`.
 */
export class ConfigClient {
  constructor(private readonly http: AbsoloHttp) {}

  list(
    projectId: Id,
    envId: Id,
    query: ListConfigEntriesQuery = { reveal: false, includeShared: true },
  ): Promise<ListConfigEntriesResponse> {
    return this.http.request(
      'GET',
      `/v1/projects/${projectId}/environments/${envId}/config`,
      { query: query as never },
    );
  }

  /** Bulk replace: every key not present in `entries` is removed. */
  replace(
    projectId: Id,
    envId: Id,
    req: ReplaceConfigRequest,
  ): Promise<ListConfigEntriesResponse> {
    return this.http.request(
      'PUT',
      `/v1/projects/${projectId}/environments/${envId}/config`,
      { body: req },
    );
  }

  /** Partial update: upsert / remove specific keys without touching the rest. */
  patch(
    projectId: Id,
    envId: Id,
    req: PatchConfigRequest,
  ): Promise<ListConfigEntriesResponse> {
    return this.http.request(
      'PATCH',
      `/v1/projects/${projectId}/environments/${envId}/config`,
      { body: req },
    );
  }

  /** Import a `.env` blob. Use `apply: false` for dry-run diff preview. */
  import(
    projectId: Id,
    envId: Id,
    req: ImportConfigRequest,
  ): Promise<{ diff: ConfigDiff; applied: boolean }> {
    return this.http.request(
      'POST',
      `/v1/projects/${projectId}/environments/${envId}/config/import`,
      { body: req },
    );
  }

  /** Export effective config as `.env`. Server gates secret reveal by scope. */
  export(projectId: Id, envId: Id, reveal = false): Promise<{ content: string }> {
    return this.http.request(
      'GET',
      `/v1/projects/${projectId}/environments/${envId}/config/export`,
      { query: { reveal } },
    );
  }

  listVersions(projectId: Id, envId: Id): Promise<{ data: ConfigVersion[] }> {
    return this.http.request(
      'GET',
      `/v1/projects/${projectId}/environments/${envId}/config/versions`,
    );
  }

  restoreVersion(projectId: Id, envId: Id, versionId: Id): Promise<ListConfigEntriesResponse> {
    return this.http.request(
      'POST',
      `/v1/projects/${projectId}/environments/${envId}/config/versions/${versionId}/restore`,
    );
  }

  diff(projectId: Id, envId: Id, fromVersionId: Id, toVersionId: Id): Promise<ConfigDiff> {
    return this.http.request(
      'GET',
      `/v1/projects/${projectId}/environments/${envId}/config/diff`,
      { query: { from: fromVersionId, to: toVersionId } },
    );
  }
}
