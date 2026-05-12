import { AbsoloHttp } from '../http.js';
import type { Billing } from '@absolo/contracts';

export class BillingClient {
  constructor(private readonly http: AbsoloHttp) {}

  // Subscription

  async getSubscription(orgId: string) {
    return this.http.request<{ data: Billing.Subscription | null }>(
      'GET',
      `/v1/orgs/${orgId}/billing/subscription`,
    );
  }

  async subscribe(orgId: string, body: Billing.CreateSubscriptionRequest) {
    return this.http.request<{ id: string; stripeSubscriptionId: string }>(
      'POST',
      `/v1/orgs/${orgId}/billing/subscribe`,
      { body },
    );
  }

  async changePlan(orgId: string, body: Billing.ChangePlanRequest) {
    return this.http.request<{ subscriptionId: string; planId: string }>(
      'PUT',
      `/v1/orgs/${orgId}/billing/plan`,
      { body },
    );
  }

  // Usage

  async getUsage(orgId: string, from?: string, to?: string) {
    return this.http.request<Billing.UsageSummary>('GET', `/v1/orgs/${orgId}/billing/usage`, {
      query: { from, to },
    });
  }

  async getCurrentSpend(orgId: string) {
    return this.http.request<{ data: any }>('GET', `/v1/orgs/${orgId}/billing/spend`);
  }

  // Invoices

  async listInvoices(orgId: string) {
    return this.http.request<{ data: Billing.Invoice[] }>(
      'GET',
      `/v1/orgs/${orgId}/billing/invoices`,
    );
  }

  async getInvoicePdf(orgId: string, invoiceId: string) {
    return this.http.request<{ url: string | null }>(
      'GET',
      `/v1/orgs/${orgId}/billing/invoices/${invoiceId}/pdf`,
    );
  }

  // Payment methods

  async listPaymentMethods(orgId: string) {
    return this.http.request<{ data: Billing.PaymentMethod[] }>(
      'GET',
      `/v1/orgs/${orgId}/billing/payment-methods`,
    );
  }

  async addPaymentMethod(orgId: string, body: Billing.AddPaymentMethodRequest) {
    return this.http.request<Billing.PaymentMethod>(
      'POST',
      `/v1/orgs/${orgId}/billing/payment-methods`,
      { body },
    );
  }

  async setDefaultPaymentMethod(orgId: string, paymentMethodId: string) {
    return this.http.request<{ ok: boolean }>(
      'PUT',
      `/v1/orgs/${orgId}/billing/payment-methods/${paymentMethodId}/default`,
    );
  }

  // Tax

  async updateTaxProfile(orgId: string, body: Billing.TaxProfileRequest) {
    return this.http.request<{ ok: boolean }>('PUT', `/v1/orgs/${orgId}/billing/tax`, { body });
  }

  // Spend cap

  async setSpendCap(orgId: string, body: Billing.SpendCapRequest) {
    return this.http.request<{ ok: boolean }>('POST', `/v1/orgs/${orgId}/billing/spend-cap`, {
      body,
    });
  }

  async getSpendCap(orgId: string) {
    return this.http.request<{ data: Billing.SpendCapStatus }>(
      'GET',
      `/v1/orgs/${orgId}/billing/spend-cap`,
    );
  }

  // Portal

  async createPortalSession(orgId: string, body: Billing.PortalSessionRequest) {
    return this.http.request<Billing.PortalSessionResponse>(
      'POST',
      `/v1/orgs/${orgId}/billing/portal`,
      { body },
    );
  }
}
