import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type {
  CreateProjectRequest,
  Project,
  UpdateProjectRequest,
} from '@absolo/contracts/projects';
import { DB, type Database } from '../../db/db.module.js';
import { projects } from '../../db/schema.js';
import { newId } from '../../common/ids.js';
import { OrgsService } from '../iam/orgs.service.js';
import type { AuthenticatedUser } from '../iam/types.js';

/**
 * Projects domain service.
 *
 * Phase 0: thin CRUD over the `projects` Postgres schema. Async work like
 * scaffolding from a template, allocating a default subdomain and provisioning
 * a production environment is delegated to the orchestrator (NATS event:
 * `projects.created`) and is implemented in a later phase.
 *
 * Plan refs:
 * - `docs/plans/08-projects-apps-service-d1e00e.md`
 * - `docs/plans/28-data-model-postgres-d1e00e.md` §projects
 */
@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly orgs: OrgsService,
  ) {}

  async list(user: AuthenticatedUser, orgId: string): Promise<Project[]> {
    await this.assertMembership(user, orgId);
    const rows = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.orgId, orgId), isNull(projects.deletedAt)))
      .orderBy(desc(projects.createdAt));
    return rows.map((r) => this.toDomain(r));
  }

  async get(user: AuthenticatedUser, projectId: string): Promise<Project> {
    const [row] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);
    if (!row) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    await this.assertMembership(user, row.orgId);
    return this.toDomain(row);
  }

  async create(
    user: AuthenticatedUser,
    orgId: string,
    req: CreateProjectRequest,
  ): Promise<Project> {
    await this.assertMembership(user, orgId);
    const region = req.region ?? 'eu-central';
    const id = newId('prj');

    try {
      const [row] = await this.db
        .insert(projects)
        .values({
          id,
          orgId,
          slug: req.slug,
          name: req.name,
          description: req.description ?? '',
          kind: req.kind,
          region,
          status: 'active',
        })
        .returning();
      // The insert above is unique-checked on (org_id, slug) by the DB.
      // `templateSlug` and async provisioning is a phase-1 concern.
      return this.toDomain(row!);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `A project with slug "${req.slug}" already exists in this organisation`,
        );
      }
      throw err;
    }
  }

  async update(
    user: AuthenticatedUser,
    projectId: string,
    req: UpdateProjectRequest,
  ): Promise<Project> {
    const existing = await this.get(user, projectId);
    const [row] = await this.db
      .update(projects)
      .set({
        ...(req.name !== undefined ? { name: req.name } : {}),
        ...(req.description !== undefined ? { description: req.description } : {}),
        ...(req.status !== undefined ? { status: req.status } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, existing.id), isNull(projects.deletedAt)))
      .returning();
    if (!row) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    return this.toDomain(row);
  }

  async softDelete(user: AuthenticatedUser, projectId: string): Promise<void> {
    const existing = await this.get(user, projectId);
    const [row] = await this.db
      .update(projects)
      .set({ deletedAt: new Date(), status: 'pending_deletion', updatedAt: new Date() })
      .where(and(eq(projects.id, existing.id), isNull(projects.deletedAt)))
      .returning({ id: projects.id });
    if (!row) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }

  /**
   * Throws 403 if the caller is not a member of the org. Reuses the iam
   * `OrgsService` so the decision lives next to the membership table.
   *
   * Role-aware checks (e.g., only `maintainer+` can delete) are tracked in
   * plan 04 §casbin and added in the orgs slice; for Phase 0 any membership
   * grants full access.
   */
  private async assertMembership(user: AuthenticatedUser, orgId: string): Promise<void> {
    const m = await this.orgs.findMembership(user.id, orgId);
    if (!m) {
      throw new ForbiddenException('You do not have access to this organisation');
    }
  }

  private toDomain(row: typeof projects.$inferSelect): Project {
    return {
      id: row.id,
      orgId: row.orgId,
      slug: row.slug,
      name: row.name,
      description: row.description,
      kind: row.kind as Project['kind'],
      status: row.status as Project['status'],
      region: row.region as Project['region'],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  );
}
