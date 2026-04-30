import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { OrchestratorService } from './orchestrator.service.js';

@Controller('orchestrator')
export class OrchestratorController {
  private readonly logger = new Logger(OrchestratorController.name);

  constructor(private readonly orchestratorService: OrchestratorService) {}

  @EventPattern('orchestrator.deployment.live')
  async handleDeploymentLive(@Payload() data: any) {
    this.logger.log(`Received orchestrator.deployment.live event: ${JSON.stringify(data)}`);
    // Note: Since we simulate deployment up above we can consume the event here
    // In later phases we'd watch kubernetes events and emit this back into our system.
  }
}
