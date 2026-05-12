import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { DB, type Database } from '../../db/db.module.js';
import { subdomains, customDomains } from '../../db/schema.js';
import { newId } from '../../common/ids.js';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import * as k8s from '@kubernetes/client-node';

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);
  private k8sObjectApi?: k8s.KubernetesObjectApi;

  constructor(@Inject(DB) private readonly db: Database) {
    const kc = new k8s.KubeConfig();
    try {
      kc.loadFromDefault();
      this.k8sObjectApi = kc.makeApiClient(k8s.KubernetesObjectApi);
    } catch {
      this.logger.warn('Could not load KubeConfig, cluster operations will fail');
    }
  }

  async allocateSubdomain(orgId: string, appId: string, slug: string) {
    const id = newId('sub');
    const rand = randomBytes(2).toString('hex');
    const fullHost = `${slug}-${rand}.absolo.app`;

    const result = await this.db
      .insert(subdomains)
      .values({
        id,
        fullHost,
        appId,
        orgId,
      })
      .returning();

    this.logger.log(`Allocated subdomain ${fullHost} to app ${appId}`);

    return result[0];
  }

  async listDomains(orgId: string, appId: string) {
    const subs = await this.db
      .select()
      .from(subdomains)
      .where(and(eq(subdomains.appId, appId), eq(subdomains.orgId, orgId)));
    const customs = await this.db
      .select()
      .from(customDomains)
      .where(and(eq(customDomains.appId, appId), eq(customDomains.orgId, orgId)));
    return { subdomains: subs, custom_domains: customs };
  }

  async addCustomDomain(orgId: string, appId: string, domainName: string) {
    const id = newId('dom');
    const result = await this.db
      .insert(customDomains)
      .values({
        id,
        domainName,
        appId,
        orgId,
        status: 'PENDING_VERIFICATION',
      })
      .returning();

    this.logger.log(`Added custom domain ${domainName}, requesting cert-manager Certificate`);

    if (this.k8sObjectApi) {
      try {
        await this.k8sObjectApi.create({
          apiVersion: 'cert-manager.io/v1',
          kind: 'Certificate',
          metadata: {
            name: `cert-${id}`,
            namespace: 'default',
          },
          spec: {
            secretName: `tls-${id}`,
            issuerRef: {
              name: 'letsencrypt-prod',
              kind: 'ClusterIssuer',
            },
            dnsNames: [domainName],
          },
        });
      } catch (err) {
        this.logger.error(`Failed to create cert-manager Certificate for ${domainName}`, err);
      }
    }

    return result[0];
  }
}
