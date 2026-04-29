import type { AbsoloHttp } from '../http.js';
import type { Id, PageQuery } from '@absolo/contracts/common';
import type {
  CreateProjectRequest,
  Project,
  UpdateProjectRequest,
} from '@absolo/contracts/projects';

export class ProjectsClient {
  constructor(private readonly http: AbsoloHttp) {}

  list(orgId: Id, query: PageQuery = { pageSize: 50 }): Promise<{ data: Project[] }> {
    return this.http.request('GET', `/v1/orgs/${orgId}/projects`, { query: query as never });
  }

  get(projectId: Id): Promise<Project> {
    return this.http.request('GET', `/v1/projects/${projectId}`);
  }

  create(orgId: Id, req: CreateProjectRequest): Promise<Project> {
    return this.http.request('POST', `/v1/orgs/${orgId}/projects`, { body: req });
  }

  update(projectId: Id, req: UpdateProjectRequest): Promise<Project> {
    return this.http.request('PATCH', `/v1/projects/${projectId}`, { body: req });
  }

  delete(projectId: Id): Promise<void> {
    return this.http.request('DELETE', `/v1/projects/${projectId}`);
  }
}
