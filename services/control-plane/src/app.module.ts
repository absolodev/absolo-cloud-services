import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './db/db.module.js';
import { ApiErrorFilter } from './common/api-error.filter.js';
import { HealthModule } from './modules/health/health.module.js';
import { IamModule } from './modules/iam/iam.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { EnvironmentsModule } from './modules/environments/environments.module.js';
import { EnvVarsModule } from './modules/env-vars/env-vars.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { OutboxModule } from './modules/outbox/outbox.module.js';
import { AppsModule } from './modules/apps/apps.module.js';

/**
 * Root module wiring every domain module + cross-cutting concerns.
 *
 * IamModule registers a global `AuthGuard` (APP_GUARD) so every route is
 * authenticated by default; routes opt out with `@Public()`.
 *
 * As more modules come online (orgs, environments, config, billing, …) they
 * are added here. Stub modules for work-in-progress can live alongside so
 * the dependency graph stays real.
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    IamModule,
    HealthModule,
    ProjectsModule,
    EnvironmentsModule,
    EnvVarsModule,
    BillingModule,
    OutboxModule,
    AppsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ApiErrorFilter,
    },
  ],
})
export class AppModule {}
