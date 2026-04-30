import { Inject, Module, Global, OnApplicationShutdown } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/app-config.js';
import * as schema from './schema.js';

export const DB = Symbol('DB');
export const PG_CLIENT = Symbol('PG_CLIENT');

export type Database = ReturnType<typeof drizzle<typeof schema>>;

@Global()
@Module({
  providers: [
    {
      provide: PG_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => {
        return postgres(config.DATABASE_URL, {
          max: config.DATABASE_POOL_MAX,
          // postgres-js opts; see plan 28 for connection guidance.
          prepare: false,
        });
      },
    },
    {
      provide: DB,
      inject: [PG_CLIENT],
      useFactory: (client: ReturnType<typeof postgres>) => drizzle(client, { schema }),
    },
  ],
  exports: [DB, PG_CLIENT],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_CLIENT) private readonly client: ReturnType<typeof postgres>) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
