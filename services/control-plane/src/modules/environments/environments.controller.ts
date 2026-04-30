import { Controller, Get, Post, Param, Delete } from '@nestjs/common';
import { EnvironmentsService } from './environments.service.js';

@Controller('environments')
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Post()
  create() {
    return this.environmentsService.create();
  }

  @Get()
  findAll() {
    return this.environmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.environmentsService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.environmentsService.remove(+id);
  }
}
