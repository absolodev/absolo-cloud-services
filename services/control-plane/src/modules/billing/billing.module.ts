import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { BillingMeterService } from './billing-meter.service.js';

@Module({
  controllers: [BillingController],
  providers: [BillingService, BillingMeterService],
  exports: [BillingService, BillingMeterService],
})
export class BillingModule {}
