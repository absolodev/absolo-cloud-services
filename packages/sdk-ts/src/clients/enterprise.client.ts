import { AbsoloHttp } from '../http.js';
import type { Enterprise } from '@absolo/contracts';

export class EnterpriseClient {
  constructor(private readonly http: AbsoloHttp) {}

  async listClusters(orgId: string): Promise<Enterprise.ListClustersResponse> {
    return this.http.request<Enterprise.ListClustersResponse>('GET', `/v1/enterprise/clusters`, {
      query: { orgId },
    });
  }

  async createCluster(
    req: Enterprise.CreateClusterRequest,
  ): Promise<Enterprise.CreateClusterResponse> {
    return this.http.request<Enterprise.CreateClusterResponse>('POST', '/v1/enterprise/clusters', {
      body: req,
    });
  }

  async listClusterHosts(clusterId: string): Promise<Enterprise.ListClusterHostsResponse> {
    return this.http.request<Enterprise.ListClusterHostsResponse>(
      'GET',
      `/v1/enterprise/clusters/${clusterId}/hosts`,
    );
  }

  async addClusterHost(
    clusterId: string,
    req: Enterprise.AddClusterHostRequest,
  ): Promise<Enterprise.AddClusterHostResponse> {
    return this.http.request<Enterprise.AddClusterHostResponse>(
      'POST',
      `/v1/enterprise/clusters/${clusterId}/hosts`,
      { body: req },
    );
  }
}
