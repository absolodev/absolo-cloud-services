import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { DatabasesService } from './databases.service.js';
import { DatabasesBackupService } from './databases-backup.service.js';

@Controller()
export class DatabasesController {
  constructor(
    private readonly service: DatabasesService,
    private readonly backups: DatabasesBackupService,
  ) {}

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  @Post('v1/projects/:projectId/databases')
  async createDatabase(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      orgId: string;
      name: string;
      engine: string;
      version: string;
      size?: string;
      ha?: boolean;
      region?: string;
      storageGb?: number;
      environmentId?: string;
    },
  ) {
    const db = await this.service.provisionDatabase({
      orgId: body.orgId,
      projectId,
      environmentId: body.environmentId,
      name: body.name,
      engine: body.engine,
      version: body.version,
      size: body.size ?? 's',
      ha: body.ha ?? false,
      region: body.region ?? 'eu-central',
      storageGb: body.storageGb ?? 1,
    });
    return { data: db };
  }

  @Get('v1/databases')
  async listDatabases(@Query('orgId') orgId: string) {
    const data = await this.service.listDatabases(orgId);
    return { data };
  }

  @Get('v1/databases/:id')
  async getDatabase(@Param('id') id: string) {
    const data = await this.service.getDatabase(id);
    return { data };
  }

  @Delete('v1/databases/:id')
  async deleteDatabase(@Param('id') id: string) {
    await this.service.deleteDatabase(id);
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Scaling
  // ---------------------------------------------------------------------------

  @Put('v1/databases/:id/scale')
  async scaleDatabase(@Param('id') id: string, @Body() body: { size: string; storageGb?: number }) {
    const data = await this.service.scaleDatabase(id, body.size, body.storageGb);
    return { data };
  }

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------

  @Post('v1/databases/:id/users')
  async createUser(@Param('id') id: string, @Body() body: { username: string; scope?: string }) {
    const data = await this.service.createDatabaseUser(id, body.username, body.scope);
    return { data };
  }

  @Get('v1/databases/:id/users')
  async listUsers(@Param('id') id: string) {
    const data = await this.service.listDatabaseUsers(id);
    return { data };
  }

  @Delete('v1/databases/:id/users/:userId')
  async deleteUser(@Param('id') id: string, @Param('userId') userId: string) {
    await this.service.deleteDatabaseUser(id, userId);
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Credentials
  // ---------------------------------------------------------------------------

  @Post('v1/databases/:id/credentials/rotate')
  async rotateCredentials(@Param('id') id: string) {
    const data = await this.service.rotateCredentials(id);
    return { data };
  }

  // ---------------------------------------------------------------------------
  // Parameter groups
  // ---------------------------------------------------------------------------

  @Put('v1/databases/:id/parameter-group')
  async setParameterGroup(@Param('id') id: string, @Body() body: { parameterGroupId: string }) {
    await this.service.setParameterGroup(id, body.parameterGroupId);
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Backups
  // ---------------------------------------------------------------------------

  @Post('v1/databases/:id/backups')
  async createBackup(@Param('id') id: string, @Body() body: { kind?: 'wal' | 'snapshot' }) {
    const data = await this.backups.createBackup(id, body.kind);
    return { data };
  }

  @Get('v1/databases/:id/backups')
  async listBackups(@Param('id') id: string) {
    const data = await this.backups.listBackups(id);
    return { data };
  }

  @Post('v1/databases/:id/restore')
  async restoreFromBackup(
    @Param('id') _id: string,
    @Body() body: { backupId: string; name: string },
  ) {
    const data = await this.backups.restoreFromBackup(body.backupId, body.name);
    return { data };
  }
}
