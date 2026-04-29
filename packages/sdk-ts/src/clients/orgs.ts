import type { AbsoloHttp } from '../http.js';
import type { Id, PageQuery } from '@absolo/contracts/common';
import type {
  CreateOrgRequest,
  InviteOrgMemberRequest,
  Org,
  OrgMember,
  UpdateOrgRequest,
} from '@absolo/contracts/orgs';

export class OrgsClient {
  constructor(private readonly http: AbsoloHttp) {}

  list(query: PageQuery = { pageSize: 50 }): Promise<{ data: Org[] }> {
    return this.http.request('GET', '/v1/orgs', { query: query as never });
  }

  get(orgId: Id): Promise<Org> {
    return this.http.request('GET', `/v1/orgs/${orgId}`);
  }

  create(req: CreateOrgRequest): Promise<Org> {
    return this.http.request('POST', '/v1/orgs', { body: req });
  }

  update(orgId: Id, req: UpdateOrgRequest): Promise<Org> {
    return this.http.request('PATCH', `/v1/orgs/${orgId}`, { body: req });
  }

  delete(orgId: Id): Promise<void> {
    return this.http.request('DELETE', `/v1/orgs/${orgId}`);
  }

  listMembers(orgId: Id): Promise<{ data: OrgMember[] }> {
    return this.http.request('GET', `/v1/orgs/${orgId}/members`);
  }

  inviteMember(orgId: Id, req: InviteOrgMemberRequest): Promise<{ inviteId: Id }> {
    return this.http.request('POST', `/v1/orgs/${orgId}/members`, { body: req });
  }
}
