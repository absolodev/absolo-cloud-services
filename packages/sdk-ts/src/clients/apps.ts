import { AbsoloHttp } from '../http.js';
import type { Apps } from '@absolo/contracts';

export class AppsClient {
  constructor(private readonly http: AbsoloHttp) {}

  async create(body: Apps.CreateAppBody) {
    return this.http.request<{ data: Apps.App }>('POST', '/v1/apps', {
      body: JSON.stringify(body),
    });
  }

  async list(environmentId: string) {
    return this.http.request<{ data: Apps.App[] }>(
      'GET',
      `/v1/apps?environmentId=${environmentId}`,
    );
  }

  async deploy(id: string, body: Apps.AppDeploymentBody) {
    return this.http.request<{ data: any }>('POST', `/v1/apps/${id}/deployments`, {
      body: JSON.stringify(body),
    });
  }
}
