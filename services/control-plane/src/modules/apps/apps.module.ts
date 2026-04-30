import { Module } from '@nestjs/common';
import { AppsController } from './apps.controller.js';
import { AppsService } from './apps.service.js';
import { DatabaseModule } from '../../db/db.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';

@Module({
  imports: [DatabaseModule, OutboxModule],
  controllers: [AppsController],
  providers: [AppsService],
  exports: [AppsService],
})
export class AppsModule {}
