import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB, type Database } from '../../db/db.module.js';
import { regions } from '../../db/schema.js';

@Injectable()
export class PlatformService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listRegions() {
    return this.db.select().from(regions);
  }

  async getRegion(code: string) {
    const [region] = await this.db.select().from(regions).where(eq(regions.code, code));
    if (!region) throw new NotFoundException(`Region ${code} not found`);
    return region;
  }
}
