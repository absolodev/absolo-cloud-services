import { Controller, Post, Get, Param, Req, Headers, BadRequestException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { BillingService } from './billing.service.js';
import { Public } from '../iam/public.decorator.js';

@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() rawReq: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    // In Fastify with NestJS, the raw body is accessible via rawReq.rawBody
    // if configured, otherwise we must enable raw body parsing in Fastify adapter.
    // For now, this is a scaffold.
    return this.service.handleStripeWebhook(Buffer.from(''), signature);
  }

  @Get('portal/:orgId')
  async getPortal(@Param('orgId') orgId: string) {
    // Return a mocked session URL for now
    return { url: `https://billing.stripe.com/p/session/test_mock_${orgId}` };
  }
}
