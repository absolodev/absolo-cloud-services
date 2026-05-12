import { Module } from '@nestjs/common';
import { PlatformService } from './platform.service.js';
import { PlatformController } from './platform.controller.js';

@Module({
  providers: [PlatformService],
  controllers: [PlatformController],
  exports: [PlatformService],
})
export class PlatformModule {}
