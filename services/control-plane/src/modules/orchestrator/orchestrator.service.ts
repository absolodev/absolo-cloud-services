import { Injectable, Inject, Logger } from '@nestjs/common';
import { OutboxService } from '../outbox/outbox.service.js';
import * as k8s from '@kubernetes/client-node';
import { DB, type Database } from '../../db/db.module.js';
import { apps, environments, projects, organizations } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { connect } from 'nats';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private k8sAppsApi?: k8s.AppsV1Api;
  private k8sCoreApi?: k8s.CoreV1Api;
  private natsClient: any;
  private kvStore: any;

  constructor(
    private readonly outbox: OutboxService,
    @Inject(DB) private readonly db: Database,
  ) {
    const kc = new k8s.KubeConfig();
    try {
      kc.loadFromDefault();
      this.k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
      this.k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
    } catch {
      this.logger.warn('Could not load KubeConfig, cluster operations will fail');
    }

    this.initNats();
  }

  private async initNats() {
    try {
      const url = process.env.NATS_URL || 'nats://localhost:4222';
      this.natsClient = await connect({ servers: url });
      const js = this.natsClient.jetstream();
      this.kvStore = await js.views.kv('ROUTES');
      this.logger.log('Connected to NATS KV for ROUTES');
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.warn(`Could not connect to NATS KV: ${err.message}`);
      } else {
        this.logger.warn('Could not connect to NATS KV');
      }
    }
  }

  async deployToK3s(payload: any) {
    this.logger.log(`Received deployment requested event for deployment: ${payload.deployment_id}`);

    // Load full app hierarchy to create names
    const appData = await this.db
      .select({
        appId: apps.id,
        appSlug: apps.slug,
        envId: environments.id,
        envSlug: environments.slug,
        projId: projects.id,
        projSlug: projects.slug,
        orgId: projects.orgId,
      })
      .from(apps)
      .innerJoin(environments, eq(apps.environmentId, environments.id))
      .innerJoin(projects, eq(environments.projectId, projects.id))
      .where(eq(apps.id, payload.app_id));

    if (appData.length === 0 || !appData[0]) {
      this.logger.error(
        `App ${payload.app_id} not found, aborting deployment ${payload.deployment_id}`,
      );
      return;
    }

    const appObj = appData[0];
    const orgId = appObj.orgId;
    const projId = appObj.projId;
    const envId = appObj.envId;
    const appId = appObj.appId;
    const appSlug = appObj.appSlug;

    const namespace_name = `org-${orgId}-app-${appId}`;
    const app_label = `app-${appId}`;
    const release_name = `app-${appId}-${payload.deployment_id || Date.now()}`;
    const image_tag = payload.image_tag || 'nginx:alpine';

    this.logger.debug(
      `Applying K8s manifest for ${release_name} in ${namespace_name} using image ${image_tag}`,
    );

    if (this.k8sCoreApi && this.k8sAppsApi) {
      try {
        // Ensure namespace exists
        await this.k8sCoreApi.readNamespace({ name: namespace_name }).catch(async () => {
          await this.k8sCoreApi?.createNamespace({
            body: {
              apiVersion: 'v1',
              kind: 'Namespace',
              metadata: { name: namespace_name },
            },
          });
        });

        // Upsert Deployment
        const deploymentPayload: k8s.V1Deployment = {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          metadata: {
            name: release_name,
            labels: { app: app_label, deployment: payload.deployment_id },
          },
          spec: {
            replicas: 1,
            selector: { matchLabels: { app: release_name } },
            template: {
              metadata: { labels: { app: release_name, owner: app_label } },
              spec: {
                containers: [
                  {
                    name: 'main',
                    image: image_tag,
                    ports: [{ containerPort: 3000 }],
                    env: [
                      { name: 'PORT', value: '3000' },
                      { name: 'NODE_ENV', value: 'production' },
                    ],
                  },
                ],
              },
            },
          },
        };

        try {
          await this.k8sAppsApi.readNamespacedDeployment({
            name: release_name,
            namespace: namespace_name,
          });
          await this.k8sAppsApi.replaceNamespacedDeployment({
            name: release_name,
            namespace: namespace_name,
            body: deploymentPayload,
          });
        } catch {
          await this.k8sAppsApi.createNamespacedDeployment({
            namespace: namespace_name,
            body: deploymentPayload,
          });
        }

        // Upsert Service
        const servicePayload: k8s.V1Service = {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: { name: app_label },
          spec: {
            selector: { app: release_name }, // Blue/Green flip
            ports: [{ port: 80, targetPort: 3000 as any }],
          },
        };
        try {
          await this.k8sCoreApi.readNamespacedService({
            name: app_label,
            namespace: namespace_name,
          });

          // Perform Blue/Green swap by updating service selector
          await this.k8sCoreApi.replaceNamespacedService({
            name: app_label,
            namespace: namespace_name,
            body: {
              apiVersion: 'v1',
              kind: 'Service',
              metadata: { name: app_label },
              spec: {
                selector: { app: release_name },
                ports: [{ port: 80, targetPort: 3000 as any }],
              },
            },
          });
        } catch {
          await this.k8sCoreApi.createNamespacedService({
            namespace: namespace_name,
            body: servicePayload,
          });
        }

        // Update routing KV
        if (this.kvStore) {
          // Internal subdomain
          const domain = `${appSlug}.absolo.app`;
          const target = `http://${app_label}.${namespace_name}.svc.cluster.local:80`;
          await this.kvStore.put(domain, new TextEncoder().encode(target));
          this.logger.log(`Updated routing: ${domain} -> ${target}`);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          this.logger.error(`Deployment failed: ${err.message}`, err);
        } else {
          this.logger.error('Deployment failed with unknown error', err);
        }
        return;
      }
    }

    // Immediately mark as deployed
    const outboxPayload = {
      saga_id: payload.saga_id,
      deployment_id: payload.deployment_id,
      status: 'READY',
    };

    if (this.natsClient) {
      this.natsClient.publish(
        'orchestrator.deployment.live',
        new TextEncoder().encode(JSON.stringify(outboxPayload)),
      );
    }
  }

  async scaleApp(appId: string, replicas: number) {
    this.logger.log(`Scaling app ${appId} to ${replicas} replicas`);

    const appData = await this.db
      .select({
        orgId: projects.orgId,
      })
      .from(apps)
      .innerJoin(environments, eq(apps.environmentId, environments.id))
      .innerJoin(projects, eq(environments.projectId, projects.id))
      .where(eq(apps.id, appId));

    if (appData.length === 0 || !appData[0]) {
      throw new Error(`App ${appId} not found`);
    }

    const { orgId } = appData[0];
    const namespace_name = `org-${orgId}-app-${appId}`;
    const app_label = `app-${appId}`;
    // we don't know release_name offhand. Find active deployment via service
    let release_name = app_label;

    if (this.k8sAppsApi) {
      try {
        const res = await this.k8sAppsApi.readNamespacedDeployment({
          name: release_name,
          namespace: namespace_name,
        });
        const deployment = res;
        if (deployment.spec) {
          deployment.spec.replicas = replicas;
          await this.k8sAppsApi.replaceNamespacedDeployment({
            name: release_name,
            namespace: namespace_name,
            body: deployment,
          });
          this.logger.log(`Successfully scaled app ${appId}`);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          this.logger.error(`Failed to scale deployment: ${err.message}`, err);
        }
      }
    }
  }
}
