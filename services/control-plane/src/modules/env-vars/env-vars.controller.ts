import { Controller, Get, Post, Param, Delete } from '@nestjs/common';
import { EnvVarsService } from './env-vars.service.js';

@Controller('env-vars')
export class EnvVarsController {
  constructor(private readonly envVarsService: EnvVarsService) {}

  @Post()
  create() {
    return this.envVarsService.create();
  }

  @Get()
  findAll() {
    return this.envVarsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.envVarsService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.envVarsService.remove(+id);
  }
}
