import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { EnterpriseService } from './enterprise.service.js';

@Controller('v1/enterprise')
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @Get('clusters')
  async listClusters(@Query('orgId') orgId: string) {
    const data = await this.enterpriseService.listClusters(orgId);
    return { data };
  }

  @Post('clusters')
  async createCluster(@Body() body: any) {
    // in a real app, use Zod pipe
    // Need orgId, assuming it comes from body for this demo, or auth context
    const data = await this.enterpriseService.createCluster(body.orgId || 'org_test', body);
    return { data };
  }

  @Get('clusters/:id/hosts')
  async listHosts(@Param('id') clusterId: string) {
    const data = await this.enterpriseService.listHosts(clusterId);
    return { data };
  }

  @Post('clusters/:id/hosts')
  async addHost(@Param('id') clusterId: string, @Body() body: any) {
    const data = await this.enterpriseService.addHost(clusterId, body);
    return { data };
  }
}
