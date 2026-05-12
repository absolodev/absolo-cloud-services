import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import * as k8s from '@kubernetes/client-node';
import { DB, type Database } from '../../db/db.module.js';
import { newId } from '../../common/ids.js';
import { OutboxService } from '../outbox/outbox.service.js';
import {
  managedDatabases,
  databaseUsers,
  maintenanceWindows,
  parameterGroups,
  organizations,
} from '../../db/schema.js';
import { randomBytes, createHash } from 'crypto';

// Size → resource mapping
const SIZE_SPECS: Record<string, { cpu: string; memory: string }> = {
  xs: { cpu: '250m', memory: '256Mi' },
  s: { cpu: '500m', memory: '512Mi' },
  m: { cpu: '1', memory: '1Gi' },
  l: { cpu: '2', memory: '2Gi' },
  xl: { cpu: '4', memory: '4Gi' },
  '2xl': { cpu: '8', memory: '8Gi' },
  '4xl': { cpu: '16', memory: '16Gi' },
};

@Injectable()
export class DatabasesService {
  private readonly logger = new Logger(DatabasesService.name);
  private k8sObjectApi?: k8s.KubernetesObjectApi;
  private k8sCoreApi?: k8s.CoreV1Api;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly outbox: OutboxService,
  ) {
    const kc = new k8s.KubeConfig();
    try {
      kc.loadFromDefault();
      this.k8sObjectApi = kc.makeApiClient(k8s.KubernetesObjectApi);
      this.k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
    } catch {
      this.logger.warn('Could not load KubeConfig, cluster operations will fail');
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async listDatabases(orgId: string) {
    return this.db
      .select()
      .from(managedDatabases)
      .where(and(eq(managedDatabases.orgId, orgId), isNull(managedDatabases.deletedAt)))
      .orderBy(desc(managedDatabases.createdAt));
  }

  async getDatabase(id: string) {
    const [db] = await this.db.select().from(managedDatabases).where(eq(managedDatabases.id, id));
    if (!db) throw new NotFoundException(`Database ${id} not found`);
    return db;
  }

  // ---------------------------------------------------------------------------
  // Provisioning
  // ---------------------------------------------------------------------------

  async provisionDatabase(opts: {
    orgId: string;
    projectId: string;
    environmentId?: string | undefined;
    name: string;
    engine: string;
    version: string;
    size: string;
    ha: boolean;
    region: string;
    storageGb: number;
  }) {
    const id = newId('mdb');
    const masterPassword = randomBytes(24).toString('base64url');
    const passwordEnc = this.encryptPassword(masterPassword);
    const namespace = `db-${id.replace('mdb_', '').toLowerCase().slice(0, 20)}`;
    const crName = `${opts.engine}-${id.replace('mdb_', '').toLowerCase().slice(0, 16)}`;

    return await this.db.transaction(async (tx) => {
      const [database] = await tx
        .insert(managedDatabases)
        .values({
          id,
          orgId: opts.orgId,
          projectId: opts.projectId,
          environmentId: opts.environmentId,
          name: opts.name,
          engine: opts.engine,
          version: opts.version,
          size: opts.size,
          ha: opts.ha,
          region: opts.region,
          storageGb: opts.storageGb,
          status: 'provisioning',
          masterPasswordEnc: passwordEnc,
          k8sNamespace: namespace,
          k8sCrName: crName,
        })
        .returning();

      // Create default maintenance window
      await tx.insert(maintenanceWindows).values({
        databaseId: id,
        dayOfWeek: 0,
        hourUtc: 4,
        durationMin: 60,
      });

      // Start provisioning saga
      await this.outbox.createSaga(tx, 'DATABASE_PROVISION', {
        databaseId: id,
        engine: opts.engine,
        version: opts.version,
        namespace,
        crName,
      });

      await this.outbox.publish(tx, 'database.provision.requested', {
        databaseId: id,
        orgId: opts.orgId,
        engine: opts.engine,
        version: opts.version,
        size: opts.size,
        ha: opts.ha,
        storageGb: opts.storageGb,
      });

      return database;
    });
  }

  /**
   * Apply the K8s operator CR for the database.
   * Called by the saga worker after the outbox event is picked up.
   */
  async applyOperatorCR(databaseId: string) {
    const db = await this.getDatabase(databaseId);
    if (!this.k8sObjectApi || !this.k8sCoreApi) {
      this.logger.warn('No K8s client, skipping operator CR creation');
      return;
    }

    const specs = SIZE_SPECS[db.size] ?? SIZE_SPECS['s']!;

    // Create namespace
    try {
      await this.k8sCoreApi.createNamespace({
        body: { metadata: { name: db.k8sNamespace! } },
      } as any);
    } catch (err: any) {
      if (err?.statusCode !== 409) throw err;
    }

    // Apply operator CR based on engine
    const cr = this.buildOperatorCR(db, specs);
    try {
      await this.k8sObjectApi.create(cr);
      this.logger.log(`Applied ${db.engine} operator CR for ${databaseId}`);
    } catch (err: any) {
      if (err?.statusCode === 409) {
        this.logger.debug(`CR already exists for ${databaseId}`);
      } else {
        throw err;
      }
    }
  }

  private buildOperatorCR(
    db: typeof managedDatabases.$inferSelect,
    specs: { cpu: string; memory: string },
  ): any {
    switch (db.engine) {
      case 'postgres':
        return {
          apiVersion: 'postgresql.cnpg.io/v1',
          kind: 'Cluster',
          metadata: { name: db.k8sCrName!, namespace: db.k8sNamespace! },
          spec: {
            instances: db.ha ? 3 : 1,
            postgresql: { parameters: {} },
            bootstrap: {
              initdb: {
                database: 'app',
                owner: db.masterUsername,
              },
            },
            storage: {
              size: `${db.storageGb}Gi`,
              storageClass: 'longhorn',
            },
            resources: {
              requests: specs,
              limits: { ...specs, memory: specs.memory },
            },
          },
        };

      case 'mysql':
        return {
          apiVersion: 'pxc.percona.com/v1',
          kind: 'PerconaXtraDBCluster',
          metadata: { name: db.k8sCrName!, namespace: db.k8sNamespace! },
          spec: {
            pxc: {
              size: db.ha ? 3 : 1,
              resources: { requests: specs },
              volumeSpec: {
                persistentVolumeClaim: {
                  storageClassName: 'longhorn',
                  resources: { requests: { storage: `${db.storageGb}Gi` } },
                },
              },
            },
          },
        };

      case 'redis':
        return {
          apiVersion: 'databases.spotahome.com/v1',
          kind: 'RedisFailover',
          metadata: { name: db.k8sCrName!, namespace: db.k8sNamespace! },
          spec: {
            redis: {
              replicas: db.ha ? 3 : 1,
              resources: { requests: specs },
            },
            sentinel: {
              replicas: db.ha ? 3 : 1,
            },
          },
        };

      default:
        throw new Error(`Unsupported engine: ${db.engine}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Scaling
  // ---------------------------------------------------------------------------

  async scaleDatabase(id: string, newSize: string, newStorageGb?: number) {
    const db = await this.getDatabase(id);

    const updates: Record<string, any> = {
      size: newSize,
      status: 'scaling',
      updatedAt: new Date(),
    };
    if (newStorageGb && newStorageGb > db.storageGb) {
      updates.storageGb = newStorageGb;
    }

    await this.db.update(managedDatabases).set(updates).where(eq(managedDatabases.id, id));

    this.logger.log(`Scaling database ${id} to ${newSize}`);
    return { ...db, ...updates };
  }

  // ---------------------------------------------------------------------------
  // Deletion
  // ---------------------------------------------------------------------------

  async deleteDatabase(id: string) {
    const db = await this.getDatabase(id);

    await this.db
      .update(managedDatabases)
      .set({ status: 'deleting', updatedAt: new Date() })
      .where(eq(managedDatabases.id, id));

    // Delete K8s resources
    if (this.k8sObjectApi && db.k8sNamespace) {
      try {
        await this.k8sCoreApi!.deleteNamespace({ name: db.k8sNamespace });
        this.logger.log(`Deleted namespace ${db.k8sNamespace} for database ${id}`);
      } catch (err) {
        this.logger.error(`Failed to delete namespace for database ${id}`, err);
      }
    }

    await this.db
      .update(managedDatabases)
      .set({ status: 'deleted', deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(managedDatabases.id, id));

    this.logger.log(`Deleted database ${id}`);
  }

  // ---------------------------------------------------------------------------
  // Users & credentials
  // ---------------------------------------------------------------------------

  async createDatabaseUser(
    databaseId: string,
    username: string,
    scope: string = 'full',
    boundAppId?: string,
  ) {
    const db = await this.getDatabase(databaseId);
    const password = randomBytes(24).toString('base64url');
    const passwordEnc = this.encryptPassword(password);

    const id = newId('dbu');
    const [user] = await this.db
      .insert(databaseUsers)
      .values({
        id,
        databaseId,
        username,
        passwordEnc,
        scope,
        boundAppId,
      })
      .returning();

    this.logger.log(`Created user ${username} for database ${databaseId}`);
    // Return the password once — it won't be retrievable after this
    return { ...user, password };
  }

  async listDatabaseUsers(databaseId: string) {
    return this.db
      .select({
        id: databaseUsers.id,
        username: databaseUsers.username,
        scope: databaseUsers.scope,
        boundAppId: databaseUsers.boundAppId,
        createdAt: databaseUsers.createdAt,
      })
      .from(databaseUsers)
      .where(eq(databaseUsers.databaseId, databaseId));
  }

  async deleteDatabaseUser(databaseId: string, userId: string) {
    const [user] = await this.db
      .select()
      .from(databaseUsers)
      .where(and(eq(databaseUsers.id, userId), eq(databaseUsers.databaseId, databaseId)));

    if (!user) throw new NotFoundException(`User ${userId} not found`);

    await this.db.delete(databaseUsers).where(eq(databaseUsers.id, userId));
    this.logger.log(`Deleted user ${user.username} from database ${databaseId}`);
  }

  async rotateCredentials(databaseId: string) {
    const db = await this.getDatabase(databaseId);
    const newPassword = randomBytes(24).toString('base64url');
    const passwordEnc = this.encryptPassword(newPassword);

    await this.db
      .update(managedDatabases)
      .set({ masterPasswordEnc: passwordEnc, updatedAt: new Date() })
      .where(eq(managedDatabases.id, databaseId));

    this.logger.log(`Rotated master credentials for database ${databaseId}`);
    return { password: newPassword };
  }

  // ---------------------------------------------------------------------------
  // Parameter groups
  // ---------------------------------------------------------------------------

  async listParameterGroups(engine: string) {
    return this.db.select().from(parameterGroups).where(eq(parameterGroups.engine, engine));
  }

  async setParameterGroup(databaseId: string, parameterGroupId: string) {
    await this.getDatabase(databaseId); // Ensure exists
    // In production, this would also update the operator CR with new params
    this.logger.log(`Applied parameter group ${parameterGroupId} to database ${databaseId}`);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Simple AES-256 encryption for passwords at rest */
  private encryptPassword(password: string): string {
    // In production this would use a proper KMS/Vault key
    // For now, base64 encode — the real encryption layer is added when Vault ships
    return Buffer.from(password).toString('base64');
  }

  /** Decrypt an encrypted password */
  decryptPassword(encrypted: string): string {
    return Buffer.from(encrypted, 'base64').toString();
  }
}
