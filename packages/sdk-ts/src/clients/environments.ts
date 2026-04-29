import type { AbsoloHttp } from '../http.js';
import type { Id } from '@absolo/contracts/common';
import type {
  CreateEnvironmentRequest,
  Environment,
  UpdateEnvironmentRequest,
} from '@absolo/contracts/environments';

export class EnvironmentsClient {
  constructor(private readonly http: AbsoloHttp) {}

  list(projectId: Id): Promise<{ data: Environment[] }> {
    return this.http.request('GET', `/v1/projects/${projectId}/environments`);
  }

  get(projectId: Id, envId: Id): Promise<Environment> {
    return this.http.request('GET', `/v1/projects/${projectId}/environments/${envId}`);
  }

  create(projectId: Id, req: CreateEnvironmentRequest): Promise<Environment> {
    return this.http.request('POST', `/v1/projects/${projectId}/environments`, { body: req });
  }

  update(projectId: Id, envId: Id, req: UpdateEnvironmentRequest): Promise<Environment> {
    return this.http.request('PATCH', `/v1/projects/${projectId}/environments/${envId}`, {
      body: req,
    });
  }

  delete(projectId: Id, envId: Id): Promise<void> {
    return this.http.request('DELETE', `/v1/projects/${projectId}/environments/${envId}`);
  }
}
