import { z } from 'zod';

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export const PlanSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  monthlyAnchorCents: z.number().int(),
  includedUnits: z.record(z.string(), z.number()).default({}),
  displayOrder: z.number().int(),
  archivedAt: z.string().nullable().optional(),
});

export type Plan = z.infer<typeof PlanSchema>;

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

export const SubscriptionStatusSchema = z.enum(['active', 'past_due', 'canceled', 'trialing']);

export const SubscriptionSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  planId: z.string(),
  stripeSubscriptionId: z.string().nullable().optional(),
  status: SubscriptionStatusSchema,
  currentPeriodStart: z.string().nullable().optional(),
  currentPeriodEnd: z.string().nullable().optional(),
  canceledAt: z.string().nullable().optional(),
  plan: PlanSchema.nullable().optional(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const ChangePlanRequestSchema = z.object({
  planCode: z.string().min(1),
});

export type ChangePlanRequest = z.infer<typeof ChangePlanRequestSchema>;

export const CreateSubscriptionRequestSchema = z.object({
  planCode: z.string().min(1),
});

export type CreateSubscriptionRequest = z.infer<typeof CreateSubscriptionRequestSchema>;

// ---------------------------------------------------------------------------
// Payment method
// ---------------------------------------------------------------------------

export const PaymentMethodSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  brand: z.string().nullable().optional(),
  last4: z.string().nullable().optional(),
  expMonth: z.number().int().nullable().optional(),
  expYear: z.number().int().nullable().optional(),
  isDefault: z.boolean(),
  createdAt: z.string(),
});

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const AddPaymentMethodRequestSchema = z.object({
  stripePaymentMethodId: z.string().min(1),
});

export type AddPaymentMethodRequest = z.infer<typeof AddPaymentMethodRequestSchema>;

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

export const InvoiceStatusSchema = z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']);

export const InvoiceSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  stripeInvoiceId: z.string().nullable().optional(),
  number: z.string().nullable().optional(),
  status: InvoiceStatusSchema,
  totalCents: z.number().int(),
  taxCents: z.number().int(),
  currency: z.string(),
  periodStart: z.string().nullable().optional(),
  periodEnd: z.string().nullable().optional(),
  pdfUrl: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type Invoice = z.infer<typeof InvoiceSchema>;

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export const UsageSummaryItemSchema = z.object({
  kind: z.string(),
  totalQty: z.number(),
});

export const UsageSummarySchema = z.object({
  period: z.object({
    from: z.string(),
    to: z.string(),
  }),
  data: z.array(UsageSummaryItemSchema),
});

export type UsageSummaryItem = z.infer<typeof UsageSummaryItemSchema>;
export type UsageSummary = z.infer<typeof UsageSummarySchema>;

// ---------------------------------------------------------------------------
// Spend cap
// ---------------------------------------------------------------------------

export const SpendCapRequestSchema = z.object({
  limitCents: z.number().int().min(0),
});

export type SpendCapRequest = z.infer<typeof SpendCapRequestSchema>;

export const SpendCapStatusSchema = z.object({
  exceeded: z.boolean(),
  currentCents: z.number().int(),
  limitCents: z.number().int(),
});

export type SpendCapStatus = z.infer<typeof SpendCapStatusSchema>;

// ---------------------------------------------------------------------------
// Tax
// ---------------------------------------------------------------------------

export const TaxProfileRequestSchema = z.object({
  country: z.string().min(2).max(2),
  vatId: z.string().optional(),
});

export type TaxProfileRequest = z.infer<typeof TaxProfileRequestSchema>;

// ---------------------------------------------------------------------------
// Portal
// ---------------------------------------------------------------------------

export const PortalSessionRequestSchema = z.object({
  returnUrl: z.string().url(),
});

export type PortalSessionRequest = z.infer<typeof PortalSessionRequestSchema>;

export const PortalSessionResponseSchema = z.object({
  url: z.string().url(),
});

export type PortalSessionResponse = z.infer<typeof PortalSessionResponseSchema>;
