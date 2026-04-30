import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './db/db.module.js';
import { ApiErrorFilter } from './common/api-error.filter.js';
import { HealthModule } from './modules/health/health.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';

/**
 * Root module wiring every domain module + cross-cutting concerns.
 *
 * As more modules come online (iam, orgs, environments, config, billing, …)
 * they're added here. Stub modules for that work-in-progress live alongside
 * (e.g. `iam.module.ts` with TODO routes) so the dependency graph is real.
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    HealthModule,
    ProjectsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ApiErrorFilter,
    },
  ],
})
export class AppModule {}
