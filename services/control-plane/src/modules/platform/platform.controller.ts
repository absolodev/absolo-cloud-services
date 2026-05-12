import { Controller, Get, Param } from '@nestjs/common';
import { PlatformService } from './platform.service.js';

@Controller()
export class PlatformController {
  constructor(private readonly service: PlatformService) {}

  @Get('v1/regions')
  async listRegions() {
    const data = await this.service.listRegions();
    return { data };
  }

  @Get('v1/regions/:code')
  async getRegion(@Param('code') code: string) {
    const data = await this.service.getRegion(code);
    return { data };
  }
}
