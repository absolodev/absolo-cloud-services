import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { DomainsService } from './domains.service.js';

@Controller('v1/apps/:appId/domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get()
  async listDomains(@Param('appId') appId: string, @Req() req: any) {
    const orgId = req.user?.orgId || 'unknown-org'; // using mock user context
    return this.domainsService.listDomains(orgId, appId);
  }

  @Post()
  async addCustomDomain(
    @Param('appId') appId: string,
    @Body('domain_name') domainName: string,
    @Req() req: any,
  ) {
    const orgId = req.user?.orgId || 'unknown-org';
    return this.domainsService.addCustomDomain(orgId, appId, domainName);
  }

  @Post('allocate')
  async allocateSubdomain(
    @Param('appId') appId: string,
    @Body('slug') slug: string,
    @Req() req: any,
  ) {
    const orgId = req.user?.orgId || 'unknown-org';
    return this.domainsService.allocateSubdomain(orgId, appId, slug);
  }
}
