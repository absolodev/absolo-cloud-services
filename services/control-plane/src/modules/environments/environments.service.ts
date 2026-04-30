import { Injectable, Inject } from '@nestjs/common';
import { DB, type Database } from '../../db/db.module.js';

@Injectable()
export class EnvironmentsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  create() {
    return 'This action adds a new environment';
  }

  findAll() {
    return `This action returns all environments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} environment`;
  }

  remove(id: number) {
    return `This action removes a #${id} environment`;
  }
}
