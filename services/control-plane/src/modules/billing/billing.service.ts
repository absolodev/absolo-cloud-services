import { Injectable, Inject, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { APP_CONFIG } from '../../config/config.module.js';
import type { AppConfig } from '../../config/app-config.js';

@Injectable()
export class BillingService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(BillingService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
      appInfo: {
        name: 'Absolo Cloud',
        version: '0.0.0',
      },
    });
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.STRIPE_WEBHOOK_SECRET,
      );

      this.logger.log(`Received Stripe event: ${event.type} [${event.id}]`);

      // Dispatch business logic according to event type...
      switch (event.type) {
        case 'checkout.session.completed':
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          break;
        default:
          this.logger.debug(`Unhandled event type ${event.type}`);
      }

      return { received: true };
    } catch (err) {
      this.logger.error('Webhook signature verification failed', err);
      // Let Nest handle it or throw BadRequest
      throw err;
    }
  }

  async getCustomer(customerId: string) {
    return this.stripe.customers.retrieve(customerId);
  }
}
