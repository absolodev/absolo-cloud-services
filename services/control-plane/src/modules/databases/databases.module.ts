import { Module } from '@nestjs/common';
import { DatabasesController } from './databases.controller.js';
import { DatabasesService } from './databases.service.js';
import { DatabasesBackupService } from './databases-backup.service.js';
import { OutboxModule } from '../outbox/outbox.module.js';

@Module({
  imports: [OutboxModule],
  controllers: [DatabasesController],
  providers: [DatabasesService, DatabasesBackupService],
  exports: [DatabasesService, DatabasesBackupService],
})
export class DatabasesModule {}
