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
import { ProjectsService } from './projects.service.js';

/**
 * REST surface for projects.
 *
 * Auth: every route requires an authenticated session (enforced by the global
 * auth guard, wired in a later commit). For now the controller assumes the
 * caller has access — TODO: orgId scoping check via Casbin.
 */
@Controller()
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get('/v1/orgs/:orgId/projects')
  async list(@Param('orgId') orgId: string): Promise<{ data: Project[] }> {
    const data = await this.service.list(orgId);
    return { data };
  }

  @Post('/v1/orgs/:orgId/projects')
  async create(
    @Param('orgId') orgId: string,
    @Body(new ZodPipe(CreateProjectRequestSchema)) req: CreateProjectRequest,
  ): Promise<Project> {
    return this.service.create(orgId, req);
  }

  @Get('/v1/projects/:projectId')
  async get(@Param('projectId') projectId: string): Promise<Project> {
    return this.service.get(projectId);
  }

  @Patch('/v1/projects/:projectId')
  async update(
    @Param('projectId') projectId: string,
    @Body(new ZodPipe(UpdateProjectRequestSchema)) req: UpdateProjectRequest,
  ): Promise<Project> {
    return this.service.update(projectId, req);
  }

  @Delete('/v1/projects/:projectId')
  @HttpCode(204)
  async remove(@Param('projectId') projectId: string): Promise<void> {
    await this.service.softDelete(projectId);
  }
}
