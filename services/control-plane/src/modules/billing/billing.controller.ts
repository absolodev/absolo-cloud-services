import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  Req,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { BillingService } from './billing.service.js';
import { Public } from '../iam/public.decorator.js';

@Controller()
export class BillingController {
  constructor(private readonly service: BillingService) {}

  // ---------------------------------------------------------------------------
  // Stripe webhook (public — no auth, Stripe signature verifies)
  // ---------------------------------------------------------------------------

  @Public()
  @Post('v1/webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() rawReq: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    // Fastify raw body — must be enabled in main.ts via rawBody: true
    const payload = rawReq.rawBody;
    if (!payload) {
      throw new BadRequestException('Missing raw body — ensure rawBody is enabled');
    }

    return this.service.handleStripeWebhook(Buffer.from(payload), signature);
  }

  // ---------------------------------------------------------------------------
  // Subscription
  // ---------------------------------------------------------------------------

  @Get('v1/orgs/:orgId/billing/subscription')
  async getSubscription(@Param('orgId') orgId: string) {
    const sub = await this.service.getSubscription(orgId);
    return { data: sub };
  }

  @Put('v1/orgs/:orgId/billing/plan')
  async changePlan(@Param('orgId') orgId: string, @Body() body: { planCode: string }) {
    return this.service.changePlan(orgId, body.planCode);
  }

  @Post('v1/orgs/:orgId/billing/subscribe')
  async createSubscription(@Param('orgId') orgId: string, @Body() body: { planCode: string }) {
    return this.service.createSubscription(orgId, body.planCode);
  }

  // ---------------------------------------------------------------------------
  // Usage
  // ---------------------------------------------------------------------------

  @Get('v1/orgs/:orgId/billing/usage')
  async getUsage(
    @Param('orgId') orgId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const sub = await this.service.getSubscription(orgId);
    const fromDate = from ? new Date(from) : (sub?.currentPeriodStart ?? new Date());
    const toDate = to ? new Date(to) : new Date();

    const summary = await this.service.getUsageSummary(orgId, fromDate, toDate);
    return { data: summary, period: { from: fromDate, to: toDate } };
  }

  @Get('v1/orgs/:orgId/billing/spend')
  async getCurrentSpend(@Param('orgId') orgId: string) {
    return { data: await this.service.getCurrentPeriodSpend(orgId) };
  }

  // ---------------------------------------------------------------------------
  // Invoices
  // ---------------------------------------------------------------------------

  @Get('v1/orgs/:orgId/billing/invoices')
  async listInvoices(@Param('orgId') orgId: string) {
    const data = await this.service.listInvoices(orgId);
    return { data };
  }

  @Get('v1/orgs/:orgId/billing/invoices/:invoiceId/pdf')
  async getInvoicePdf(@Param('orgId') orgId: string, @Param('invoiceId') invoiceId: string) {
    const url = await this.service.getInvoicePdfUrl(orgId, invoiceId);
    return { url };
  }

  // ---------------------------------------------------------------------------
  // Payment methods
  // ---------------------------------------------------------------------------

  @Get('v1/orgs/:orgId/billing/payment-methods')
  async listPaymentMethods(@Param('orgId') orgId: string) {
    const data = await this.service.listPaymentMethods(orgId);
    return { data };
  }

  @Post('v1/orgs/:orgId/billing/payment-methods')
  async addPaymentMethod(
    @Param('orgId') orgId: string,
    @Body() body: { stripePaymentMethodId: string },
  ) {
    return this.service.addPaymentMethod(orgId, body.stripePaymentMethodId);
  }

  @Put('v1/orgs/:orgId/billing/payment-methods/:pmId/default')
  async setDefaultPaymentMethod(@Param('orgId') orgId: string, @Param('pmId') pmId: string) {
    await this.service.setDefaultPaymentMethod(orgId, pmId);
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Tax
  // ---------------------------------------------------------------------------

  @Put('v1/orgs/:orgId/billing/tax')
  async updateTaxProfile(
    @Param('orgId') orgId: string,
    @Body() body: { country: string; vatId?: string },
  ) {
    await this.service.upsertTaxProfile(orgId, body.country, body.vatId);
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Spend cap
  // ---------------------------------------------------------------------------

  @Post('v1/orgs/:orgId/billing/spend-cap')
  async setSpendCap(@Param('orgId') orgId: string, @Body() body: { limitCents: number }) {
    await this.service.setSpendCap(orgId, body.limitCents);
    return { ok: true };
  }

  @Get('v1/orgs/:orgId/billing/spend-cap')
  async getSpendCap(@Param('orgId') orgId: string) {
    return { data: await this.service.checkSpendCap(orgId) };
  }

  // ---------------------------------------------------------------------------
  // Portal
  // ---------------------------------------------------------------------------

  @Post('v1/orgs/:orgId/billing/portal')
  async createPortalSession(@Param('orgId') orgId: string, @Body() body: { returnUrl: string }) {
    return this.service.createPortalSession(orgId, body.returnUrl);
  }
}
