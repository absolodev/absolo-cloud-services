import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { DB, type Database } from '../../db/db.module.js';
import { subdomains, customDomains } from '../../db/schema.js';
import { newId } from '../../common/ids.js';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

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

    // TODO: Publish event to update edge-proxy NATS KV routing
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

    // TODO: Kick off verification saga with cert-manager
    return result[0];
  }
}
