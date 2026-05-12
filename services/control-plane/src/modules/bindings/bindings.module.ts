import { Module } from '@nestjs/common';
import { BindingsController } from './bindings.controller.js';
import { BindingsService } from './bindings.service.js';
import { DatabasesModule } from '../databases/databases.module.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [DatabasesModule, StorageModule],
  controllers: [BindingsController],
  providers: [BindingsService],
  exports: [BindingsService],
})
export class BindingsModule {}
