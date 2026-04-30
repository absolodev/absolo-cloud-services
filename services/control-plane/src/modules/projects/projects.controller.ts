import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  type CreateProjectRequest,
  type Project,
  type UpdateProjectRequest,
} from '@absolo/contracts/projects';
import { ZodPipe } from '../../common/zod.pipe.js';
import { CurrentUser } from '../iam/current-user.decorator.js';
import type { AuthenticatedUser } from '../iam/types.js';
import { ProjectsService } from './projects.service.js';

/**
 * REST surface for projects.
 *
 * Auth: every route requires an authenticated session (global `AuthGuard`)
 * and is org-scoped — the service asserts the caller is a member of the
 * requested org / project's org and throws 403 otherwise. Fine-grained
 * permission checks (read vs admin) are tracked in plan 04 §casbin and
 * land alongside the orgs CRUD slice.
 */
@Controller()
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get('/v1/orgs/:orgId/projects')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orgId') orgId: string,
  ): Promise<{ data: Project[] }> {
    const data = await this.service.list(user, orgId);
    return { data };
  }

  @Post('/v1/orgs/:orgId/projects')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orgId') orgId: string,
    @Body(new ZodPipe(CreateProjectRequestSchema)) req: CreateProjectRequest,
  ): Promise<Project> {
    return this.service.create(user, orgId, req);
  }

  @Get('/v1/projects/:projectId')
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ): Promise<Project> {
    return this.service.get(user, projectId);
  }

  @Patch('/v1/projects/:projectId')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body(new ZodPipe(UpdateProjectRequestSchema)) req: UpdateProjectRequest,
  ): Promise<Project> {
    return this.service.update(user, projectId, req);
  }

  @Delete('/v1/projects/:projectId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ): Promise<void> {
    await this.service.softDelete(user, projectId);
  }
}
