import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { StorageService } from './storage.service.js';

@Controller()
export class StorageController {
  constructor(private readonly service: StorageService) {}

  @Post('v1/projects/:projectId/buckets')
  async createBucket(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      orgId: string;
      name: string;
      slug: string;
      region?: string;
      publicRead?: boolean;
      versioning?: boolean;
    },
  ) {
    const result = await this.service.createBucket({ ...body, projectId });
    return { data: result };
  }

  @Get('v1/buckets')
  async listBuckets(@Query('orgId') orgId: string) {
    const data = await this.service.listBuckets(orgId);
    return { data };
  }

  @Get('v1/buckets/:id')
  async getBucket(@Param('id') id: string) {
    const data = await this.service.getBucket(id);
    return { data };
  }

  @Delete('v1/buckets/:id')
  async deleteBucket(@Param('id') id: string) {
    await this.service.deleteBucket(id);
    return { ok: true };
  }

  @Put('v1/buckets/:id/public-read')
  async setPublicRead(@Param('id') id: string, @Body() body: { publicRead: boolean }) {
    await this.service.setPublicRead(id, body.publicRead);
    return { ok: true };
  }

  @Put('v1/buckets/:id/versioning')
  async setVersioning(@Param('id') id: string, @Body() body: { versioning: boolean }) {
    await this.service.setVersioning(id, body.versioning);
    return { ok: true };
  }

  @Put('v1/buckets/:id/lifecycle')
  async setLifecycleRules(
    @Param('id') id: string,
    @Body()
    body: {
      rules: {
        prefix: string;
        expireDays?: number;
        transitionDays?: number;
        transitionClass?: string;
      }[];
    },
  ) {
    await this.service.setLifecycleRules(id, body.rules);
    return { ok: true };
  }

  @Get('v1/buckets/:id/lifecycle')
  async listLifecycleRules(@Param('id') id: string) {
    const data = await this.service.listLifecycleRules(id);
    return { data };
  }

  @Post('v1/buckets/:id/access-keys')
  async createAccessKey(
    @Param('id') id: string,
    @Body() body: { ownerKind: string; ownerId: string; scope?: string },
  ) {
    const data = await this.service.createAccessKey({
      ...body,
      scope: body.scope ?? 'bucket',
      bucketId: id,
    });
    return { data };
  }

  @Get('v1/buckets/:id/access-keys')
  async listAccessKeys(@Param('id') id: string) {
    const data = await this.service.listAccessKeys(id);
    return { data };
  }

  @Delete('v1/buckets/:id/access-keys/:keyId')
  async revokeAccessKey(@Param('id') _id: string, @Param('keyId') keyId: string) {
    await this.service.revokeAccessKey(keyId);
    return { ok: true };
  }
}
