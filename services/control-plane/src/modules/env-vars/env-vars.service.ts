import { Injectable, Inject } from '@nestjs/common';
import { DB, type Database } from '../../db/db.module.js';

@Injectable()
export class EnvVarsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  create() {
    return 'This action adds a new env var';
  }

  findAll() {
    return `This action returns all env vars`;
  }

  findOne(id: number) {
    return `This action returns a #${id} env var`;
  }

  remove(id: number) {
    return `This action removes a #${id} env var`;
  }
}
