import { Injectable, Inject, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { eq, and, isNull, lte, sql } from 'drizzle-orm';
import { APP_CONFIG } from '../../config/config.module.js';
import type { AppConfig } from '../../config/app-config.js';
import { DB, type Database } from '../../db/db.module.js';
import { newId } from '../../common/ids.js';
import { usageHourly, meterShipments, subscriptions, subscriptionItems } from '../../db/schema.js';
import { createHash } from 'crypto';

/**
 * BillingMeterService — ships aggregated hourly usage to Stripe Billing Meters.
 *
 * Runs as a scheduled job (hourly). For each org × resource × kind that has
 * unshipped usage in `usage_hourly`, it:
 *
 * 1. Looks up the matching `subscription_item` → `stripe_meter_id`.
 * 2. Creates a Stripe meter event with a deterministic `identifier` for idempotency.
 * 3. Records the shipment in `meter_shipments`.
 *
 * See: docs/plans/07-billing-service-d1e00e.md §Metering pipeline.
 */
@Injectable()
export class BillingMeterService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(BillingMeterService.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DB) private readonly db: Database,
  ) {
    this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
      appInfo: { name: 'Absolo Cloud Metering', version: '0.0.0' },
    });
  }

  /**
   * Main entry point — ship all un-shipped hourly buckets to Stripe.
   * Called by the scheduler every hour.
   */
  async shipPendingMeters() {
    const now = new Date();
    // Only ship hours that have fully elapsed (current hour still accumulating)
    const cutoff = new Date(now);
    cutoff.setMinutes(0, 0, 0);

    this.logger.log(`Shipping meters for hours before ${cutoff.toISOString()}`);

    // Find unshipped hourly buckets
    const unshipped = await this.db
      .select({
        orgId: usageHourly.orgId,
        resourceId: usageHourly.resourceId,
        kind: usageHourly.kind,
        hour: usageHourly.hour,
        qty: usageHourly.qty,
      })
      .from(usageHourly)
      .where(lte(usageHourly.hour, cutoff))
      .limit(1000); // Process in batches

    if (unshipped.length === 0) {
      this.logger.debug('No unshipped meters to process');
      return { shipped: 0 };
    }

    const batchId = newId('bat');
    let shipped = 0;
    let failed = 0;

    for (const row of unshipped) {
      try {
        // Check if already shipped
        const identifier = this.computeIdentifier(
          row.orgId,
          row.resourceId,
          row.kind,
          row.hour,
          batchId,
        );

        // Look up the subscription item for this org + kind
        const [sub] = await this.db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.orgId, row.orgId));

        if (!sub) {
          this.logger.debug(`No subscription for org ${row.orgId}, skipping meter`);
          continue;
        }

        const [subItem] = await this.db
          .select()
          .from(subscriptionItems)
          .where(
            and(eq(subscriptionItems.subscriptionId, sub.id), eq(subscriptionItems.kind, row.kind)),
          );

        if (!subItem?.stripeMeterId) {
          this.logger.debug(`No Stripe meter for ${row.kind} on sub ${sub.id}, skipping`);
          continue;
        }

        // Send meter event to Stripe
        await this.stripe.billing.meterEvents.create({
          event_name: row.kind,
          payload: {
            stripe_customer_id: sub.stripeSubscriptionId ?? '',
            value: String(row.qty),
          },
          identifier,
          timestamp: Math.floor(row.hour.getTime() / 1000),
        });

        // Record shipment
        await this.db
          .insert(meterShipments)
          .values({
            id: newId('msh'),
            hour: row.hour,
            kind: row.kind,
            batchId,
            sentAt: new Date(),
            stripeEventCount: 1,
            status: 'sent',
          })
          .onConflictDoNothing();

        shipped++;
      } catch (err: unknown) {
        failed++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(`Failed to ship meter for ${row.orgId}/${row.kind}: ${errorMsg}`);

        await this.db
          .insert(meterShipments)
          .values({
            id: newId('msh'),
            hour: row.hour,
            kind: row.kind,
            batchId,
            stripeEventCount: 0,
            status: 'failed',
            errorMessage: errorMsg,
          })
          .onConflictDoNothing();
      }
    }

    this.logger.log(`Meter shipment complete: ${shipped} sent, ${failed} failed`);
    return { shipped, failed, batchId };
  }

  /**
   * Deterministic identifier for Stripe meter event idempotency.
   * Hash of (hour, resource, kind, batch_id) — ensures exact-once delivery.
   */
  private computeIdentifier(
    orgId: string,
    resourceId: string,
    kind: string,
    hour: Date,
    batchId: string,
  ): string {
    const raw = `${orgId}:${resourceId}:${kind}:${hour.toISOString()}:${batchId}`;
    return createHash('sha256').update(raw).digest('hex').slice(0, 32);
  }
}
