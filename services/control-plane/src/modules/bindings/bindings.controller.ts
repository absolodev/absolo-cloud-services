import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { BindingsService } from './bindings.service.js';

@Controller()
export class BindingsController {
  constructor(private readonly service: BindingsService) {}

  @Post('v1/apps/:appId/bindings')
  async bindResource(
    @Param('appId') appId: string,
    @Body()
    body: {
      resourceType: 'database' | 'bucket';
      resourceId: string;
      envPrefix?: string;
    },
  ) {
    const data = await this.service.bindResource({ appId, ...body });
    return { data };
  }

  @Get('v1/apps/:appId/bindings')
  async listBindings(@Param('appId') appId: string) {
    const data = await this.service.listBindings(appId);
    return { data };
  }

  @Delete('v1/apps/:appId/bindings/:bindingId')
  async unbindResource(@Param('bindingId') bindingId: string) {
    await this.service.unbindResource(bindingId);
    return { ok: true };
  }

  @Get('v1/apps/:appId/bindings/env')
  async getInjectedEnvVars(@Param('appId') appId: string) {
    const data = await this.service.getInjectedEnvVars(appId);
    return { data };
  }
}
