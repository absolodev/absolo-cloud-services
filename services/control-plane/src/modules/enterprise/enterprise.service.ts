import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB, type Database } from '../../db/db.module.js';
import { enterpriseClusters, clusterHosts } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulidx';

@Injectable()
export class EnterpriseService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async createCluster(
    orgId: string,
    params: { name: string; location: string; regionProxy?: string; complianceTags?: string[] },
  ) {
    const id = `cluster_${ulid().toLowerCase()}`;
    const result = await this.db
      .insert(enterpriseClusters)
      .values({
        id,
        orgId,
        name: params.name,
        location: params.location,
        regionProxy: params.regionProxy,
        complianceTags: params.complianceTags ?? [],
        onboardingStatus: 'provisioning',
      })
      .returning();

    return result[0];
  }

  async listClusters(orgId: string) {
    return this.db.select().from(enterpriseClusters).where(eq(enterpriseClusters.orgId, orgId));
  }

  async addHost(clusterId: string, params: { fqdn: string; role: 'control-plane' | 'worker' }) {
    const id = `host_${ulid().toLowerCase()}`;
    const result = await this.db
      .insert(clusterHosts)
      .values({
        id,
        clusterId,
        fqdn: params.fqdn,
        role: params.role,
        status: 'offline', // default until agent connects
      })
      .returning();

    return result[0];
  }

  async listHosts(clusterId: string) {
    return this.db.select().from(clusterHosts).where(eq(clusterHosts.clusterId, clusterId));
  }
}
