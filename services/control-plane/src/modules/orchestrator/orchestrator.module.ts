import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service.js';
import { OrchestratorController } from './orchestrator.controller.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { DatabaseModule } from '../../db/db.module.js';

@Module({
  imports: [OutboxModule, DatabaseModule],
  controllers: [OrchestratorController],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
