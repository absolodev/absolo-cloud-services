import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/db.module.js';
import { apps, deployments } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { newId } from '../../common/ids.js';
import { OutboxService } from '../outbox/outbox.service.js';

@Injectable()
export class AppsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly outbox: OutboxService,
  ) {}

  async createEnvironmentApp(
    environmentId: string,
    slug: string,
    sourceKind: 'git' | 'dockerfile' | 'image' | 'template',
    sourceRef: string,
  ) {
    const id = newId('app');
    const [app] = await this.db
      .insert(apps)
      .values({
        id,
        environmentId,
        slug,
        sourceKind,
        sourceRef,
      })
      .returning();
    return app;
  }

  async getEnvironmentApps(environmentId: string) {
    return this.db.select().from(apps).where(eq(apps.environmentId, environmentId));
  }

  async deployApp(appId: string, versionId: string, sourceCommitSha?: string) {
    // We execute this inside a transaction:
    // 1. Create the deployment record
    // 2. Start a deployment saga
    // 3. Emit an outbox event to start the build
    return await this.db.transaction(async (tx) => {
      const [app] = await tx.select().from(apps).where(eq(apps.id, appId));
      if (!app) {
        throw new NotFoundException(`App ${appId} not found`);
      }

      const deploymentId = newId('dep');

      const [deployment] = await tx
        .insert(deployments)
        .values({
          id: deploymentId,
          appId: app.id,
          versionId,
          sourceCommitSha,
          status: 'queued',
        })
        .returning();

      // Start the saga
      const sagaId = await this.outbox.createSaga(tx, 'APP_DEPLOYMENT', {
        deploymentId,
        appId: app.id,
        environmentId: app.environmentId,
        sourceKind: app.sourceKind,
        sourceRef: app.sourceRef,
      });

      // Emitting the event to Kafka / NATS via outbox
      // builder-worker or a local orchestrator listener will pick it up
      await this.outbox.publish(tx, 'build.requested', {
        sagaId,
        deploymentId,
        appId,
        environmentId: app.environmentId,
        sourceKind: app.sourceKind,
        sourceRef: app.sourceRef,
      });

      return deployment;
    });
  }

  // Used by the builder-worker or orchestrator to report progress
  async updateDeploymentStatus(deploymentId: string, status: string, buildLogUrl?: string) {
    return await this.db.transaction(async (tx) => {
      const [deployment] = await tx
        .update(deployments)
        .set({ status, buildLogUrl })
        .where(eq(deployments.id, deploymentId))
        .returning();

      if (!deployment) {
        throw new NotFoundException(`Deployment ${deploymentId} not found`);
      }

      // If status is live, you'd also want to handle traffic swapping (e.g. outbox to edge-proxy)
      if (status === 'live') {
        const [app] = await tx.select().from(apps).where(eq(apps.id, deployment.appId));
        if (app) {
          await this.outbox.publish(tx, 'deployment.live', {
            appId: app.id,
            deploymentId,
            environmentId: app.environmentId,
          });
        }
      }

      return deployment;
    });
  }
}
