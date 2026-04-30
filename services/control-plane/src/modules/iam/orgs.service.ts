import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB, type Database } from '../../db/db.module.js';
import { memberships, organizations } from '../../db/schema.js';
import { newId } from '../../common/ids.js';

/**
 * Minimal organisations service used by the auth slice.
 *
 * The full Orgs API (CRUD, invitations, roles) lands in a separate
 * `OrgsModule` — this file only carries what auth needs:
 *
 * - `createPersonalOrg`: every new account gets a starter org so projects
 *   can be created without a separate "create your first org" step.
 * - `findMembership` / `listOrgIdsForUser`: used by the projects guard to
 *   scope reads to the caller's orgs.
 *
 * Plan refs: `docs/plans/04-iam-rbac-d1e00e.md` (roles), plan 36 §4 (auto-org).
 */
@Injectable()
export class OrgsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async createPersonalOrg(userId: string, owner: { email: string; fullName: string }) {
    const baseSlug = slugifyEmailLocal(owner.email);
    const orgId = newId('org');

    // Try a few suffixes so common local-parts (e.g. "alice") don't collide.
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomSuffix()}`;
      try {
        const [org] = await this.db
          .insert(organizations)
          .values({
            id: orgId,
            slug,
            name: `${owner.fullName}'s workspace`,
            defaultRegion: 'eu-central',
            plan: 'free',
          })
          .returning();
        await this.db.insert(memberships).values({
          userId,
          orgId: org!.id,
          role: 'owner',
        });
        return org!;
      } catch (err) {
        if (isUniqueViolation(err)) {
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    throw lastErr ?? new Error('failed to allocate org slug after 5 attempts');
  }

  async findMembership(userId: string, orgId: string) {
    const [row] = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)))
      .limit(1);
    return row ?? null;
  }

  async listOrgIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ orgId: memberships.orgId })
      .from(memberships)
      .where(eq(memberships.userId, userId));
    return rows.map((r) => r.orgId);
  }
}

function slugifyEmailLocal(email: string): string {
  const [local] = email.split('@');
  const cleaned = (local ?? 'user')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 32);
  // SlugSchema requires length >= 2 and no leading/trailing hyphens.
  return cleaned.length >= 2 ? cleaned : `user-${randomSuffix()}`;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  );
}
