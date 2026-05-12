import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import Stripe from 'stripe';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { APP_CONFIG } from '../../config/config.module.js';
import type { AppConfig } from '../../config/app-config.js';
import { DB, type Database } from '../../db/db.module.js';
import { newId } from '../../common/ids.js';
import {
  organizations,
  subscriptions,
  subscriptionItems,
  paymentMethods,
  invoices,
  usageEvents,
  usageHourly,
  meterShipments,
  taxProfiles,
  dunningState,
  credits,
  stripeWebhookEvents,
  plans,
} from '../../db/schema.js';

// Dunning escalation schedule (days after first failure)
const DUNNING_SCHEDULE = [
  { level: 1, delayDays: 3, action: 'retry' },
  { level: 2, delayDays: 5, action: 'email_warning' },
  { level: 3, delayDays: 7, action: 'suspend_nonprod' },
  { level: 4, delayDays: 10, action: 'suspend_all' },
  { level: 5, delayDays: 14, action: 'cancel_final' },
] as const;

@Injectable()
export class BillingService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DB) private readonly db: Database,
  ) {
    this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
      appInfo: {
        name: 'Absolo Cloud',
        version: '0.0.0',
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Customer management
  // ---------------------------------------------------------------------------

  async createStripeCustomer(orgId: string, email: string, name: string) {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: { absolo_org_id: orgId },
    });

    await this.db
      .update(organizations)
      .set({ stripeCustomerId: customer.id })
      .where(eq(organizations.id, orgId));

    this.logger.log(`Created Stripe customer ${customer.id} for org ${orgId}`);
    return customer;
  }

  async getOrCreateStripeCustomer(orgId: string) {
    const [org] = await this.db.select().from(organizations).where(eq(organizations.id, orgId));

    if (!org) throw new NotFoundException(`Org ${orgId} not found`);

    if (org.stripeCustomerId) {
      return this.stripe.customers.retrieve(org.stripeCustomerId);
    }

    return this.createStripeCustomer(orgId, `billing@${org.slug}.absolo.cloud`, org.name);
  }

  // ---------------------------------------------------------------------------
  // Subscription lifecycle
  // ---------------------------------------------------------------------------

  async getSubscription(orgId: string) {
    const [sub] = await this.db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId));

    if (!sub) return null;

    // Enrich with plan info
    const [plan] = await this.db.select().from(plans).where(eq(plans.id, sub.planId));

    return { ...sub, plan };
  }

  async createSubscription(orgId: string, planCode: string) {
    const [plan] = await this.db.select().from(plans).where(eq(plans.code, planCode));

    if (!plan) throw new NotFoundException(`Plan ${planCode} not found`);

    // Ensure Stripe customer exists
    const customer = await this.getOrCreateStripeCustomer(orgId);

    // Create Stripe subscription with metered items
    const stripeSub = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [
        // Anchor monthly fee (if any)
        ...(plan.monthlyAnchorCents > 0
          ? [
              {
                price_data: {
                  currency: 'usd',
                  product: 'prod_absolo_anchor',
                  unit_amount: plan.monthlyAnchorCents,
                  recurring: { interval: 'month' as const },
                },
              },
            ]
          : []),
      ],
      metadata: { absolo_org_id: orgId, absolo_plan_id: plan.id },
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    const subId = newId('sub');
    await this.db.insert(subscriptions).values({
      id: subId,
      orgId,
      planId: plan.id,
      stripeSubscriptionId: stripeSub.id,
      status: stripeSub.status,
      currentPeriodStart: new Date(((stripeSub as any).current_period_start ?? 0) * 1000),
      currentPeriodEnd: new Date(((stripeSub as any).current_period_end ?? 0) * 1000),
    });

    this.logger.log(`Created subscription ${subId} for org ${orgId} on plan ${planCode}`);
    return { id: subId, stripeSubscriptionId: stripeSub.id };
  }

  async changePlan(orgId: string, newPlanCode: string) {
    const [sub] = await this.db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId));

    if (!sub) throw new NotFoundException(`No subscription found for org ${orgId}`);

    const [plan] = await this.db.select().from(plans).where(eq(plans.code, newPlanCode));

    if (!plan) throw new NotFoundException(`Plan ${newPlanCode} not found`);

    // Update Stripe subscription
    if (sub.stripeSubscriptionId) {
      await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
        metadata: { absolo_plan_id: plan.id },
        proration_behavior: 'create_prorations',
      });
    }

    await this.db
      .update(subscriptions)
      .set({ planId: plan.id, updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));

    this.logger.log(`Changed plan for org ${orgId} to ${newPlanCode}`);
    return { subscriptionId: sub.id, planId: plan.id };
  }

  async cancelSubscription(orgId: string) {
    const [sub] = await this.db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId));

    if (!sub) throw new NotFoundException(`No subscription found for org ${orgId}`);

    if (sub.stripeSubscriptionId) {
      await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    await this.db
      .update(subscriptions)
      .set({ status: 'canceled', canceledAt: new Date(), updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));

    this.logger.log(`Canceled subscription for org ${orgId}`);
  }

  // ---------------------------------------------------------------------------
  // Payment methods
  // ---------------------------------------------------------------------------

  async listPaymentMethods(orgId: string) {
    return this.db.select().from(paymentMethods).where(eq(paymentMethods.orgId, orgId));
  }

  async addPaymentMethod(orgId: string, stripePaymentMethodId: string) {
    const customer = await this.getOrCreateStripeCustomer(orgId);

    // Attach PM to Stripe customer
    const pm = await this.stripe.paymentMethods.attach(stripePaymentMethodId, {
      customer: customer.id,
    });

    const isFirst = (await this.listPaymentMethods(orgId)).length === 0;

    const id = newId('pm');
    const card = pm.card;
    const [row] = await this.db
      .insert(paymentMethods)
      .values({
        id,
        orgId,
        stripePmId: pm.id,
        brand: card?.brand ?? null,
        last4: card?.last4 ?? null,
        expMonth: card?.exp_month ?? null,
        expYear: card?.exp_year ?? null,
        isDefault: isFirst,
      })
      .returning();

    // If first PM, set as default on Stripe customer
    if (isFirst) {
      await this.stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: pm.id },
      });
    }

    this.logger.log(`Added payment method ${id} for org ${orgId}`);
    return row;
  }

  async setDefaultPaymentMethod(orgId: string, paymentMethodId: string) {
    const [pm] = await this.db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.id, paymentMethodId), eq(paymentMethods.orgId, orgId)));

    if (!pm) throw new NotFoundException(`Payment method ${paymentMethodId} not found`);

    // Clear existing defaults
    await this.db
      .update(paymentMethods)
      .set({ isDefault: false })
      .where(eq(paymentMethods.orgId, orgId));

    await this.db
      .update(paymentMethods)
      .set({ isDefault: true })
      .where(eq(paymentMethods.id, paymentMethodId));

    // Update Stripe customer
    const customer = await this.getOrCreateStripeCustomer(orgId);
    await this.stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: pm.stripePmId },
    });

    this.logger.log(`Set default payment method ${paymentMethodId} for org ${orgId}`);
  }

  // ---------------------------------------------------------------------------
  // Usage metering
  // ---------------------------------------------------------------------------

  async ingestUsageEvent(
    orgId: string,
    resourceId: string,
    kind: string,
    qty: number,
    unit: string,
    occurredAt: Date,
  ) {
    const id = newId('uev');
    await this.db.insert(usageEvents).values({
      id,
      orgId,
      resourceId,
      kind,
      qty,
      unit,
      occurredAt,
    });
    return id;
  }

  async getUsageSummary(orgId: string, from: Date, to: Date) {
    const rows = await this.db
      .select({
        kind: usageHourly.kind,
        totalQty: sql<number>`SUM(${usageHourly.qty})`.as('total_qty'),
      })
      .from(usageHourly)
      .where(
        and(eq(usageHourly.orgId, orgId), gte(usageHourly.hour, from), lte(usageHourly.hour, to)),
      )
      .groupBy(usageHourly.kind);

    return rows;
  }

  async getCurrentPeriodSpend(orgId: string) {
    const sub = await this.getSubscription(orgId);
    if (!sub?.currentPeriodStart) return { totalCents: 0, items: [] };

    const from = sub.currentPeriodStart;
    const to = new Date();
    const usage = await this.getUsageSummary(orgId, from, to);

    return {
      periodStart: from,
      periodEnd: sub.currentPeriodEnd,
      items: usage,
      // Anchor fee not included here — Stripe handles that on the subscription
    };
  }

  // ---------------------------------------------------------------------------
  // Invoices
  // ---------------------------------------------------------------------------

  async listInvoices(orgId: string, limit = 20) {
    return this.db
      .select()
      .from(invoices)
      .where(eq(invoices.orgId, orgId))
      .orderBy(desc(invoices.createdAt))
      .limit(limit);
  }

  async getInvoicePdfUrl(orgId: string, invoiceId: string) {
    const [inv] = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)));

    if (!inv) throw new NotFoundException(`Invoice ${invoiceId} not found`);

    if (inv.pdfUrl) return inv.pdfUrl;

    // Fetch from Stripe
    if (inv.stripeInvoiceId) {
      const stripeInv = await this.stripe.invoices.retrieve(inv.stripeInvoiceId);
      if (stripeInv.invoice_pdf) {
        await this.db
          .update(invoices)
          .set({ pdfUrl: stripeInv.invoice_pdf })
          .where(eq(invoices.id, invoiceId));
        return stripeInv.invoice_pdf;
      }
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Spend cap
  // ---------------------------------------------------------------------------

  async setSpendCap(orgId: string, limitCents: number) {
    await this.db
      .update(organizations)
      .set({ spendCapLimitCents: limitCents, updatedAt: new Date() })
      .where(eq(organizations.id, orgId));

    this.logger.log(`Set spend cap to ${limitCents} cents for org ${orgId}`);
  }

  async checkSpendCap(
    orgId: string,
  ): Promise<{ exceeded: boolean; currentCents: number; limitCents: number }> {
    const [org] = await this.db.select().from(organizations).where(eq(organizations.id, orgId));

    if (!org) throw new NotFoundException(`Org ${orgId} not found`);

    const spend = await this.getCurrentPeriodSpend(orgId);
    const currentCents = spend.items.reduce((sum, item) => sum + (item.totalQty ?? 0), 0);

    return {
      exceeded: org.spendCapLimitCents != null && currentCents >= org.spendCapLimitCents,
      currentCents,
      limitCents: org.spendCapLimitCents ?? 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Tax
  // ---------------------------------------------------------------------------

  async upsertTaxProfile(orgId: string, country: string, vatId?: string) {
    await this.db
      .insert(taxProfiles)
      .values({ orgId, country, vatId })
      .onConflictDoUpdate({
        target: taxProfiles.orgId,
        set: { country, vatId, updatedAt: new Date() },
      });

    this.logger.log(`Updated tax profile for org ${orgId}: country=${country}`);
  }

  // ---------------------------------------------------------------------------
  // Dunning
  // ---------------------------------------------------------------------------

  async advanceDunning(orgId: string) {
    let [state] = await this.db.select().from(dunningState).where(eq(dunningState.orgId, orgId));

    const now = new Date();
    const newLevel = state ? state.level + 1 : 1;
    const schedule = DUNNING_SCHEDULE.find((s) => s.level === newLevel);

    if (!schedule) {
      this.logger.warn(`Dunning already at max level for org ${orgId}`);
      return;
    }

    const nextAttempt = new Date(now.getTime() + schedule.delayDays * 24 * 60 * 60 * 1000);

    if (state) {
      await this.db
        .update(dunningState)
        .set({
          level: newLevel,
          lastAttemptAt: now,
          nextAttemptAt: nextAttempt,
          updatedAt: now,
        })
        .where(eq(dunningState.orgId, orgId));
    } else {
      await this.db.insert(dunningState).values({
        orgId,
        level: newLevel,
        lastAttemptAt: now,
        nextAttemptAt: nextAttempt,
      });
    }

    this.logger.log(`Advanced dunning for org ${orgId} to level ${newLevel} (${schedule.action})`);
    return { level: newLevel, action: schedule.action, nextAttemptAt: nextAttempt };
  }

  async clearDunning(orgId: string) {
    await this.db
      .update(dunningState)
      .set({ level: 0, resolvedAt: new Date(), updatedAt: new Date() })
      .where(eq(dunningState.orgId, orgId));

    this.logger.log(`Cleared dunning for org ${orgId}`);
  }

  // ---------------------------------------------------------------------------
  // Credits
  // ---------------------------------------------------------------------------

  async addCredit(orgId: string, kind: string, amountCents: number, expiresAt?: Date) {
    const id = newId('crd');
    const [credit] = await this.db
      .insert(credits)
      .values({
        id,
        orgId,
        kind,
        amountCents,
        remainingCents: amountCents,
        expiresAt,
      })
      .returning();

    this.logger.log(`Added ${amountCents}c ${kind} credit for org ${orgId}`);
    return credit;
  }

  // ---------------------------------------------------------------------------
  // Stripe Billing Portal
  // ---------------------------------------------------------------------------

  async createPortalSession(orgId: string, returnUrl: string) {
    const customer = await this.getOrCreateStripeCustomer(orgId);

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  // ---------------------------------------------------------------------------
  // Webhook handling (full dispatch)
  // ---------------------------------------------------------------------------

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.config.STRIPE_WEBHOOK_SECRET,
    );

    this.logger.log(`Received Stripe event: ${event.type} [${event.id}]`);

    // Idempotency check — skip already-processed events
    const [existing] = await this.db
      .select()
      .from(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.stripeEventId, event.id));

    if (existing?.processedAt) {
      this.logger.debug(`Event ${event.id} already processed, skipping`);
      return { received: true, duplicate: true };
    }

    // Log the event
    await this.db
      .insert(stripeWebhookEvents)
      .values({
        stripeEventId: event.id,
        eventType: event.type,
        payload: event.data,
      })
      .onConflictDoNothing();

    try {
      await this.dispatchWebhookEvent(event);

      await this.db
        .update(stripeWebhookEvents)
        .set({ processedAt: new Date() })
        .where(eq(stripeWebhookEvents.stripeEventId, event.id));
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      await this.db
        .update(stripeWebhookEvents)
        .set({ error: errorMsg })
        .where(eq(stripeWebhookEvents.stripeEventId, event.id));
      throw err;
    }

    return { received: true };
  }

  private async dispatchWebhookEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'payment_method.attached':
      case 'payment_method.detached':
        this.logger.log(`Payment method event: ${event.type}`);
        break;
      default:
        this.logger.debug(`Unhandled event type ${event.type}`);
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const orgId = invoice.metadata?.absolo_org_id;
    if (!orgId) return;

    // Upsert our invoice record
    await this.db
      .insert(invoices)
      .values({
        id: newId('inv'),
        orgId,
        stripeInvoiceId: invoice.id,
        number: invoice.number,
        status: 'paid',
        totalCents: invoice.total ?? 0,
        taxCents: (invoice as any).tax ?? 0,
        currency: invoice.currency ?? 'usd',
        periodStart: (invoice as any).period_start
          ? new Date((invoice as any).period_start * 1000)
          : null,
        periodEnd: (invoice as any).period_end
          ? new Date((invoice as any).period_end * 1000)
          : null,
        pdfUrl: invoice.invoice_pdf ?? null,
        paidAt: new Date(),
      })
      .onConflictDoUpdate({
        target: invoices.stripeInvoiceId,
        set: {
          status: 'paid',
          totalCents: invoice.total ?? 0,
          taxCents: (invoice as any).tax ?? 0,
          pdfUrl: invoice.invoice_pdf ?? null,
          paidAt: new Date(),
        },
      });

    // Clear dunning on successful payment
    await this.clearDunning(orgId);

    this.logger.log(`Invoice ${invoice.id} paid for org ${orgId}`);
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const orgId = invoice.metadata?.absolo_org_id;
    if (!orgId) return;

    // Advance dunning state
    await this.advanceDunning(orgId);

    this.logger.warn(`Invoice payment failed for org ${orgId}, dunning advanced`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const orgId = subscription.metadata?.absolo_org_id;
    if (!orgId) return;

    await this.db
      .update(subscriptions)
      .set({
        status: subscription.status,
        currentPeriodStart: new Date(((subscription as any).current_period_start ?? 0) * 1000),
        currentPeriodEnd: new Date(((subscription as any).current_period_end ?? 0) * 1000),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    this.logger.log(`Subscription ${subscription.id} updated for org ${orgId}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const orgId = subscription.metadata?.absolo_org_id;
    if (!orgId) return;

    await this.db
      .update(subscriptions)
      .set({ status: 'canceled', canceledAt: new Date(), updatedAt: new Date() })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    this.logger.log(`Subscription ${subscription.id} deleted for org ${orgId}`);
  }
}
