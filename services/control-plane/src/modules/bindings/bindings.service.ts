import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DB, type Database } from '../../db/db.module.js';
import { newId } from '../../common/ids.js';
import { bindings, managedDatabases, buckets } from '../../db/schema.js';
import { DatabasesService } from '../databases/databases.service.js';
import { StorageService } from '../storage/storage.service.js';

/** Maps engine → default env prefix */
const ENGINE_PREFIX: Record<string, string> = {
  postgres: 'DATABASE',
  mysql: 'MYSQL',
  redis: 'REDIS',
};

@Injectable()
export class BindingsService {
  private readonly logger = new Logger(BindingsService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly databasesService: DatabasesService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Bind a resource (database or bucket) to an app.
   * Creates per-app credentials and injects env vars.
   */
  async bindResource(opts: {
    appId: string;
    resourceType: 'database' | 'bucket';
    resourceId: string;
    envPrefix?: string;
  }) {
    // Check for duplicate binding
    const existing = await this.db
      .select()
      .from(bindings)
      .where(
        and(
          eq(bindings.appId, opts.appId),
          eq(bindings.resourceType, opts.resourceType),
          eq(bindings.resourceId, opts.resourceId),
        ),
      );

    if (existing.length > 0) {
      throw new ConflictException('Resource is already bound to this app');
    }

    let envPrefix = opts.envPrefix;

    // Resolve default prefix and validate resource exists
    if (opts.resourceType === 'database') {
      const db = await this.databasesService.getDatabase(opts.resourceId);
      envPrefix = envPrefix ?? ENGINE_PREFIX[db.engine] ?? 'DATABASE';

      // Create a per-app scoped database user
      await this.databasesService.createDatabaseUser(
        opts.resourceId,
        `app_${opts.appId.replace('app_', '').slice(0, 16)}`,
        'app',
        opts.appId,
      );
    } else if (opts.resourceType === 'bucket') {
      await this.storageService.getBucket(opts.resourceId);
      envPrefix = envPrefix ?? 'S3';

      // Create per-app scoped access key
      await this.storageService.createAccessKey({
        ownerKind: 'app',
        ownerId: opts.appId,
        scope: 'bucket',
        bucketId: opts.resourceId,
      });
    } else {
      throw new NotFoundException(`Unknown resource type: ${opts.resourceType}`);
    }

    const id = newId('bnd');
    const [binding] = await this.db
      .insert(bindings)
      .values({
        id,
        appId: opts.appId,
        resourceType: opts.resourceType,
        resourceId: opts.resourceId,
        envPrefix: envPrefix!,
        autoInject: true,
        status: 'active',
      })
      .returning();

    this.logger.log(
      `Bound ${opts.resourceType} ${opts.resourceId} to app ${opts.appId} (prefix: ${envPrefix})`,
    );

    return binding;
  }

  async unbindResource(bindingId: string) {
    const [binding] = await this.db.select().from(bindings).where(eq(bindings.id, bindingId));

    if (!binding) throw new NotFoundException(`Binding ${bindingId} not found`);

    // In production: revoke per-app credentials
    await this.db.delete(bindings).where(eq(bindings.id, bindingId));

    this.logger.log(
      `Unbound ${binding.resourceType} ${binding.resourceId} from app ${binding.appId}`,
    );
  }

  async listBindings(appId: string) {
    const rows = await this.db.select().from(bindings).where(eq(bindings.appId, appId));

    // Enrich with resource details
    const enriched = await Promise.all(
      rows.map(async (binding) => {
        let resource: any = null;
        if (binding.resourceType === 'database') {
          try {
            resource = await this.databasesService.getDatabase(binding.resourceId);
          } catch {}
        } else if (binding.resourceType === 'bucket') {
          try {
            resource = await this.storageService.getBucket(binding.resourceId);
          } catch {}
        }
        return { ...binding, resource };
      }),
    );

    return enriched;
  }

  /**
   * Resolve all active bindings for an app into env var key-value pairs.
   * Called by the orchestrator when deploying/restarting an app.
   */
  async getInjectedEnvVars(appId: string): Promise<Record<string, string>> {
    const appBindings = await this.db
      .select()
      .from(bindings)
      .where(and(eq(bindings.appId, appId), eq(bindings.status, 'active')));

    const envVars: Record<string, string> = {};

    for (const binding of appBindings) {
      if (!binding.autoInject) continue;
      const prefix = binding.envPrefix;

      if (binding.resourceType === 'database') {
        try {
          const db = await this.databasesService.getDatabase(binding.resourceId);
          const password = db.masterPasswordEnc
            ? this.databasesService.decryptPassword(db.masterPasswordEnc)
            : '';

          if (db.engine === 'postgres' || db.engine === 'mysql') {
            const proto = db.engine === 'postgres' ? 'postgresql' : 'mysql';
            envVars[`${prefix}_URL`] =
              `${proto}://${db.masterUsername}:${password}@${db.endpointHost ?? 'localhost'}:${db.endpointPort ?? 5432}/app`;
            envVars[`${prefix}_HOST`] = db.endpointHost ?? 'localhost';
            envVars[`${prefix}_PORT`] = String(db.endpointPort ?? 5432);
            envVars[`${prefix}_USER`] = db.masterUsername;
            envVars[`${prefix}_PASSWORD`] = password;
            envVars[`${prefix}_NAME`] = 'app';
          } else if (db.engine === 'redis') {
            envVars[`${prefix}_URL`] =
              `redis://:${password}@${db.endpointHost ?? 'localhost'}:${db.endpointPort ?? 6379}/0`;
            envVars[`${prefix}_HOST`] = db.endpointHost ?? 'localhost';
            envVars[`${prefix}_PORT`] = String(db.endpointPort ?? 6379);
          }
        } catch {
          this.logger.warn(
            `Could not resolve binding ${binding.id} (database ${binding.resourceId})`,
          );
        }
      } else if (binding.resourceType === 'bucket') {
        try {
          const bucket = await this.storageService.getBucket(binding.resourceId);
          envVars[`${prefix}_BUCKET`] = bucket.slug;
          envVars[`${prefix}_ENDPOINT`] = `https://s3.${bucket.region}.absolo.app`;
          envVars[`${prefix}_REGION`] = bucket.region;
        } catch {
          this.logger.warn(
            `Could not resolve binding ${binding.id} (bucket ${binding.resourceId})`,
          );
        }
      }
    }

    return envVars;
  }
}
