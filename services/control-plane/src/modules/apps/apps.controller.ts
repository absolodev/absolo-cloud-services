import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { AppsService } from './apps.service.js';

@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Post()
  createApp(
    @Body()
    body: {
      environmentId: string;
      slug: string;
      sourceKind: 'git' | 'dockerfile' | 'image' | 'template';
      sourceRef: string;
    },
  ) {
    return this.appsService.createEnvironmentApp(
      body.environmentId,
      body.slug,
      body.sourceKind,
      body.sourceRef,
    );
  }

  @Get(':environmentId')
  getApps(@Param('environmentId') environmentId: string) {
    return this.appsService.getEnvironmentApps(environmentId);
  }

  @Post(':appId/deployments')
  deployApp(
    @Param('appId') appId: string,
    @Body() body: { versionId: string; sourceCommitSha?: string },
  ) {
    return this.appsService.deployApp(appId, body.versionId, body.sourceCommitSha);
  }

  @Post(':appId/deployments/:deploymentId/status')
  updateDeploymentStatus(
    @Param('appId') appId: string,
    @Param('deploymentId') deploymentId: string,
    @Body() body: { status: string; buildLogUrl?: string },
  ) {
    return this.appsService.updateDeploymentStatus(deploymentId, body.status, body.buildLogUrl);
  }
}
