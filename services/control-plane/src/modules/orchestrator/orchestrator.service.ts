import { Injectable, Logger } from '@nestjs/common';
import { OutboxService } from '../outbox/outbox.service.js';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(private readonly outbox: OutboxService) {}

  async deployToK3s(payload: any) {
    this.logger.log(`Received deployment requested event for deployment: ${payload.deployment_id}`);

    // In Phase 1 we mock Helm/Argo rollout
    // Actual implementation would map to Kubernetes Client
    // applying a helm chart or raw manifests

    const namespace_name = `project-${payload.environment_id || 'unknown'}`;
    const release_name = `app-${payload.app_id || 'unknown'}`;

    this.logger.debug(
      `Would apply K8s manifest for ${release_name} in ${namespace_name} using image ${payload.image_tag}`,
    );

    // Immediately mark as deployed
    const outboxPayload = {
      saga_id: payload.saga_id,
      deployment_id: payload.deployment_id,
      status: 'READY',
    };

    // Cannot use outbox without tx. Mock it here:
    this.logger.log(
      'Simulating nats publish: orchestrator.deployment.live: ' + JSON.stringify(outboxPayload),
    );
  }
}
