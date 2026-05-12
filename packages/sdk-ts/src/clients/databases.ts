import type { Databases } from '@absolo/contracts';
import { AbsoloHttp } from '../http.js';

export class DatabasesClient {
  constructor(private readonly http: AbsoloHttp) {}

  async create(projectId: string, body: Databases.CreateDatabaseRequest) {
    return this.http.request<{ data: Databases.ManagedDatabase }>(
      'POST',
      `/v1/projects/${projectId}/databases`,
      {
        body: JSON.stringify(body),
      },
    );
  }

  async list(orgId: string) {
    return this.http.request<{ data: Databases.ManagedDatabase[] }>(
      'GET',
      `/v1/databases?orgId=${orgId}`,
    );
  }

  async get(id: string) {
    return this.http.request<{ data: Databases.ManagedDatabase }>('GET', `/v1/databases/${id}`);
  }

  async delete(id: string) {
    return this.http.request<{ ok: boolean }>('DELETE', `/v1/databases/${id}`);
  }

  async scale(id: string, body: Databases.ScaleDatabaseRequest) {
    return this.http.request<{ data: Databases.ManagedDatabase }>(
      'PUT',
      `/v1/databases/${id}/scale`,
      {
        body: JSON.stringify(body),
      },
    );
  }

  async createUser(databaseId: string, body: Databases.CreateDatabaseUserRequest) {
    return this.http.request<{ data: Databases.DatabaseUser }>(
      'POST',
      `/v1/databases/${databaseId}/users`,
      {
        body: JSON.stringify(body),
      },
    );
  }

  async listUsers(databaseId: string) {
    return this.http.request<{ data: Databases.DatabaseUser[] }>(
      'GET',
      `/v1/databases/${databaseId}/users`,
    );
  }

  async deleteUser(databaseId: string, userId: string) {
    return this.http.request<{ ok: boolean }>(
      'DELETE',
      `/v1/databases/${databaseId}/users/${userId}`,
    );
  }

  async rotateCredentials(databaseId: string) {
    return this.http.request<{ data: { password: string } }>(
      'POST',
      `/v1/databases/${databaseId}/credentials/rotate`,
    );
  }

  async setParameterGroup(databaseId: string, parameterGroupId: string) {
    return this.http.request<{ ok: boolean }>(
      'PUT',
      `/v1/databases/${databaseId}/parameter-group`,
      {
        body: JSON.stringify({ parameterGroupId }),
      },
    );
  }

  async createBackup(databaseId: string, kind: 'wal' | 'snapshot' = 'snapshot') {
    return this.http.request<{ data: Databases.DatabaseBackup }>(
      'POST',
      `/v1/databases/${databaseId}/backups`,
      {
        body: JSON.stringify({ kind }),
      },
    );
  }

  async listBackups(databaseId: string) {
    return this.http.request<{ data: Databases.DatabaseBackup[] }>(
      'GET',
      `/v1/databases/${databaseId}/backups`,
    );
  }

  async restoreFromBackup(databaseId: string, backupId: string, name: string) {
    return this.http.request<{ data: { message: string } }>(
      'POST',
      `/v1/databases/${databaseId}/restore`,
      {
        body: JSON.stringify({ backupId, name }),
      },
    );
  }
}
