import type { Storage } from '@absolo/contracts';
import { AbsoloHttp } from '../http.js';

export class StorageClient {
  constructor(private readonly http: AbsoloHttp) {}

  async create(projectId: string, body: Storage.CreateBucketRequest) {
    return this.http.request<{
      data: { bucket: Storage.Bucket; accessKey: string; secretKey: string };
    }>('POST', `/v1/projects/${projectId}/buckets`, { body: JSON.stringify(body) });
  }

  async list(orgId: string) {
    return this.http.request<{ data: Storage.Bucket[] }>('GET', `/v1/buckets?orgId=${orgId}`);
  }

  async get(id: string) {
    return this.http.request<{ data: Storage.Bucket }>('GET', `/v1/buckets/${id}`);
  }

  async delete(id: string) {
    return this.http.request<{ ok: boolean }>('DELETE', `/v1/buckets/${id}`);
  }

  async setPublicRead(id: string, publicRead: boolean) {
    return this.http.request<{ ok: boolean }>('PUT', `/v1/buckets/${id}/public-read`, {
      body: JSON.stringify({ publicRead }),
    });
  }

  async setVersioning(id: string, versioning: boolean) {
    return this.http.request<{ ok: boolean }>('PUT', `/v1/buckets/${id}/versioning`, {
      body: JSON.stringify({ versioning }),
    });
  }

  async setLifecycleRules(
    id: string,
    rules: Omit<Storage.BucketLifecycleRule, 'id' | 'bucketId'>[],
  ) {
    return this.http.request<{ ok: boolean }>('PUT', `/v1/buckets/${id}/lifecycle`, {
      body: JSON.stringify({ rules }),
    });
  }

  async listLifecycleRules(id: string) {
    return this.http.request<{ data: Storage.BucketLifecycleRule[] }>(
      'GET',
      `/v1/buckets/${id}/lifecycle`,
    );
  }

  async createAccessKey(
    bucketId: string,
    opts: { ownerKind: string; ownerId: string; scope?: string },
  ) {
    return this.http.request<{ data: Storage.AccessKey }>(
      'POST',
      `/v1/buckets/${bucketId}/access-keys`,
      {
        body: JSON.stringify(opts),
      },
    );
  }

  async listAccessKeys(bucketId: string) {
    return this.http.request<{ data: Storage.AccessKey[] }>(
      'GET',
      `/v1/buckets/${bucketId}/access-keys`,
    );
  }

  async revokeAccessKey(bucketId: string, keyId: string) {
    return this.http.request<{ ok: boolean }>(
      'DELETE',
      `/v1/buckets/${bucketId}/access-keys/${keyId}`,
    );
  }
}
