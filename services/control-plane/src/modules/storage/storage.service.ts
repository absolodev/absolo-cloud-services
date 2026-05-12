import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DB, type Database } from '../../db/db.module.js';
import { newId } from '../../common/ids.js';
import { buckets, accessKeys, bucketLifecycleRules, organizations } from '../../db/schema.js';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  // ---------------------------------------------------------------------------
  // Buckets
  // ---------------------------------------------------------------------------

  async createBucket(opts: {
    orgId: string;
    projectId: string;
    name: string;
    slug: string;
    region?: string;
    publicRead?: boolean;
    versioning?: boolean;
  }) {
    const id = newId('bkt');

    // Check slug uniqueness within org
    const existing = await this.db
      .select()
      .from(buckets)
      .where(and(eq(buckets.orgId, opts.orgId), eq(buckets.slug, opts.slug)));

    if (existing.length > 0) {
      throw new ConflictException(`Bucket slug "${opts.slug}" already exists in this org`);
    }

    const [bucket] = await this.db
      .insert(buckets)
      .values({
        id,
        orgId: opts.orgId,
        projectId: opts.projectId,
        name: opts.name,
        slug: opts.slug,
        region: opts.region ?? 'eu-central',
        publicRead: opts.publicRead ?? false,
        versioning: opts.versioning ?? false,
      })
      .returning();

    // Auto-create org-level access key for this bucket
    const keyPair = await this.createAccessKey({
      ownerKind: 'org',
      ownerId: opts.orgId,
      scope: 'bucket',
      bucketId: id,
    });

    this.logger.log(`Created bucket ${id} (${opts.slug}) for org ${opts.orgId}`);
    return { bucket, accessKey: keyPair.accessKey, secretKey: keyPair.secretKey };
  }

  async listBuckets(orgId: string) {
    return this.db
      .select()
      .from(buckets)
      .where(and(eq(buckets.orgId, orgId), isNull(buckets.deletedAt)))
      .orderBy(desc(buckets.createdAt));
  }

  async getBucket(id: string) {
    const [bucket] = await this.db.select().from(buckets).where(eq(buckets.id, id));
    if (!bucket) throw new NotFoundException(`Bucket ${id} not found`);
    return bucket;
  }

  async deleteBucket(id: string) {
    await this.getBucket(id); // Ensure exists

    // Soft delete
    await this.db.update(buckets).set({ deletedAt: new Date() }).where(eq(buckets.id, id));

    // Revoke all access keys
    await this.db.delete(accessKeys).where(eq(accessKeys.bucketId, id));

    this.logger.log(`Deleted bucket ${id}`);
  }

  async setPublicRead(id: string, publicRead: boolean) {
    await this.getBucket(id);
    await this.db.update(buckets).set({ publicRead }).where(eq(buckets.id, id));

    this.logger.log(`Set public_read=${publicRead} for bucket ${id}`);
  }

  async setVersioning(id: string, versioning: boolean) {
    await this.getBucket(id);
    await this.db.update(buckets).set({ versioning }).where(eq(buckets.id, id));

    this.logger.log(`Set versioning=${versioning} for bucket ${id}`);
  }

  // ---------------------------------------------------------------------------
  // Access keys
  // ---------------------------------------------------------------------------

  async createAccessKey(opts: {
    ownerKind: string;
    ownerId: string;
    scope: string;
    bucketId?: string;
  }) {
    const id = newId('key');
    const accessKeyValue = `ak_${randomBytes(16).toString('hex')}`;
    const secretKeyValue = randomBytes(32).toString('base64url');
    const secretHash = createHash('sha256').update(secretKeyValue).digest('hex');

    const [key] = await this.db
      .insert(accessKeys)
      .values({
        id,
        ownerKind: opts.ownerKind,
        ownerId: opts.ownerId,
        scope: opts.scope,
        bucketId: opts.bucketId,
        accessKey: accessKeyValue,
        secretHash,
      })
      .returning();

    this.logger.log(`Created access key ${id} for ${opts.ownerKind}:${opts.ownerId}`);

    // Return the secret only once — it's hashed in the DB
    return { ...key, secretKey: secretKeyValue };
  }

  async listAccessKeys(bucketId: string) {
    return this.db
      .select({
        id: accessKeys.id,
        ownerKind: accessKeys.ownerKind,
        ownerId: accessKeys.ownerId,
        scope: accessKeys.scope,
        accessKey: accessKeys.accessKey,
        lastUsedAt: accessKeys.lastUsedAt,
        createdAt: accessKeys.createdAt,
      })
      .from(accessKeys)
      .where(eq(accessKeys.bucketId, bucketId));
  }

  async revokeAccessKey(keyId: string) {
    await this.db.delete(accessKeys).where(eq(accessKeys.id, keyId));
    this.logger.log(`Revoked access key ${keyId}`);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle rules
  // ---------------------------------------------------------------------------

  async setLifecycleRules(
    bucketId: string,
    rules: {
      prefix: string;
      expireDays?: number;
      transitionDays?: number;
      transitionClass?: string;
    }[],
  ) {
    await this.getBucket(bucketId);

    // Replace all existing rules
    await this.db.delete(bucketLifecycleRules).where(eq(bucketLifecycleRules.bucketId, bucketId));

    if (rules.length > 0) {
      await this.db.insert(bucketLifecycleRules).values(
        rules.map((rule) => ({
          id: newId('lcr'),
          bucketId,
          prefix: rule.prefix,
          expireDays: rule.expireDays,
          transitionDays: rule.transitionDays,
          transitionClass: rule.transitionClass,
        })),
      );
    }

    this.logger.log(`Set ${rules.length} lifecycle rules for bucket ${bucketId}`);
  }

  async listLifecycleRules(bucketId: string) {
    return this.db
      .select()
      .from(bucketLifecycleRules)
      .where(eq(bucketLifecycleRules.bucketId, bucketId));
  }
}
