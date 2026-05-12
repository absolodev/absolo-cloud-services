import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Skeleton,
  toast,
} from '@absolo/ui';
import {
  CreditCard,
  Download,
  ExternalLink,
  Plus,
  Shield,
  TrendingUp,
  Zap,
  AlertTriangle,
} from '@absolo/icons';
import { api } from '@/lib/api';

/**
 * Phase-2 billing page.
 *
 * Layout:
 * - Current plan + subscription status
 * - Live spend widget (current period)
 * - Usage breakdown by resource kind
 * - Spend cap control
 * - Payment methods
 * - Invoice history
 */

const DEMO_ORG_ID = 'org_01HZX9DEMO0000000000000000';

export function BillingPage() {
  const orgId = DEMO_ORG_ID;

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Manage your subscription, payment methods, and invoices.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <SubscriptionCard orgId={orgId} />
        <SpendWidget orgId={orgId} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <PaymentMethodsCard orgId={orgId} />
        <SpendCapCard orgId={orgId} />
      </div>

      <div className="mt-8">
        <InvoicesTable orgId={orgId} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subscription card
// ---------------------------------------------------------------------------

function SubscriptionCard({ orgId }: { orgId: string }) {
  const subQuery = useQuery({
    queryKey: ['billing', 'subscription', orgId],
    queryFn: () => api.billing.getSubscription(orgId),
  });

  const sub = subQuery.data?.data;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-brand-500" />
            Current Plan
          </CardTitle>
          <CardDescription>Your active subscription and billing period.</CardDescription>
        </div>
        {sub && (
          <Badge
            variant={
              sub.status === 'active'
                ? 'success'
                : sub.status === 'past_due'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {sub.status}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {subQuery.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
        ) : sub ? (
          <div className="space-y-3">
            <div>
              <span className="text-2xl font-bold tracking-tight">
                {sub.plan?.name ?? 'Unknown Plan'}
              </span>
              {sub.plan?.monthlyAnchorCents != null && sub.plan.monthlyAnchorCents > 0 && (
                <span className="ml-2 text-sm text-fg-muted">
                  ${(sub.plan.monthlyAnchorCents / 100).toFixed(2)}/mo anchor
                </span>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-fg-subtle">Period start</dt>
              <dd className="text-fg font-mono text-xs">
                {sub.currentPeriodStart
                  ? new Date(sub.currentPeriodStart).toLocaleDateString()
                  : '—'}
              </dd>
              <dt className="text-fg-subtle">Period end</dt>
              <dd className="text-fg font-mono text-xs">
                {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}
              </dd>
            </dl>
          </div>
        ) : (
          <div className="text-sm text-fg-muted">
            <p>No active subscription.</p>
            <Button size="sm" className="mt-3">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Subscribe
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Live spend widget
// ---------------------------------------------------------------------------

function SpendWidget({ orgId }: { orgId: string }) {
  const spendQuery = useQuery({
    queryKey: ['billing', 'spend', orgId],
    queryFn: () => api.billing.getCurrentSpend(orgId),
    refetchInterval: 60_000, // Refresh every minute
  });

  const spend = spendQuery.data?.data;
  const items = spend?.items ?? [];
  const totalQty = items.reduce(
    (sum: number, item: { totalQty?: number }) => sum + (item.totalQty ?? 0),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-success-500" />
          Current Period Spend
        </CardTitle>
        <CardDescription>Live usage tracked hourly. Refreshes every minute.</CardDescription>
      </CardHeader>
      <CardContent>
        {spendQuery.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div>
            <div className="text-3xl font-bold tracking-tight text-fg">
              {totalQty.toLocaleString()}
              <span className="ml-1 text-sm font-normal text-fg-muted">units</span>
            </div>
            {items.length > 0 ? (
              <div className="mt-4 space-y-2">
                {items.map((item: { kind: string; totalQty?: number }, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-xs text-fg-muted">{item.kind}</span>
                    <span className="font-semibold text-fg">
                      {(item.totalQty ?? 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-fg-subtle">No metered usage this period.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Payment methods
// ---------------------------------------------------------------------------

function PaymentMethodsCard({ orgId }: { orgId: string }) {
  const pmQuery = useQuery({
    queryKey: ['billing', 'payment-methods', orgId],
    queryFn: () => api.billing.listPaymentMethods(orgId),
  });

  const methods = pmQuery.data?.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Payment Methods
          </CardTitle>
          <CardDescription>Cards on file for this organisation.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {pmQuery.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : methods.length > 0 ? (
          <div className="space-y-2">
            {methods.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center justify-between rounded-md border border-border/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-fg-subtle" />
                  <div>
                    <span className="text-sm font-medium text-fg capitalize">
                      {pm.brand ?? 'Card'}
                    </span>
                    <span className="ml-2 font-mono text-xs text-fg-muted">•••• {pm.last4}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pm.expMonth && pm.expYear && (
                    <span className="text-xs text-fg-subtle">
                      {String(pm.expMonth).padStart(2, '0')}/{pm.expYear}
                    </span>
                  )}
                  {pm.isDefault && (
                    <Badge variant="outline" className="text-[10px]">
                      Default
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">
            No payment methods on file. Add one to enable paid resources.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Spend cap
// ---------------------------------------------------------------------------

function SpendCapCard({ orgId }: { orgId: string }) {
  const [editing, setEditing] = useState(false);
  const [capValue, setCapValue] = useState('');
  const queryClient = useQueryClient();

  const capQuery = useQuery({
    queryKey: ['billing', 'spend-cap', orgId],
    queryFn: () => api.billing.getSpendCap(orgId),
  });

  const capMutation = useMutation({
    mutationFn: (limitCents: number) => api.billing.setSpendCap(orgId, { limitCents }),
    onSuccess: () => {
      toast.success('Spend cap updated');
      void queryClient.invalidateQueries({ queryKey: ['billing', 'spend-cap', orgId] });
      setEditing(false);
    },
    onError: (err: Error) => {
      toast.error('Failed to update spend cap', { description: err.message });
    },
  });

  const cap = capQuery.data?.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-warning-500" />
          Spend Cap
        </CardTitle>
        <CardDescription>
          Set a hard cap. When reached, non-prod resources suspend first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {capQuery.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : cap ? (
          <div className="space-y-3">
            {cap.exceeded && (
              <div className="flex items-center gap-2 rounded-md border border-danger-500/30 bg-danger-500/5 p-3 text-sm text-danger-700">
                <AlertTriangle className="h-4 w-4 flex-none" />
                Spend cap exceeded! Some resources may be suspended.
              </div>
            )}
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-fg-subtle">Current spend</dt>
              <dd className="font-mono text-xs text-fg">${(cap.currentCents / 100).toFixed(2)}</dd>
              <dt className="text-fg-subtle">Limit</dt>
              <dd className="font-mono text-xs text-fg">${(cap.limitCents / 100).toFixed(2)}</dd>
            </dl>
            {editing ? (
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="cap-input">New limit ($)</Label>
                  <Input
                    id="cap-input"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="100"
                    value={capValue}
                    onChange={(e) => setCapValue(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => capMutation.mutate(Math.round(parseFloat(capValue) * 100))}
                  loading={capMutation.isPending}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Change cap
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">Could not load spend cap.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Invoices table
// ---------------------------------------------------------------------------

function InvoicesTable({ orgId }: { orgId: string }) {
  const invoicesQuery = useQuery({
    queryKey: ['billing', 'invoices', orgId],
    queryFn: () => api.billing.listInvoices(orgId),
  });

  const invs = invoicesQuery.data?.data ?? [];

  const statusColor = (s: string) => {
    switch (s) {
      case 'paid':
        return 'success';
      case 'open':
        return 'warning';
      case 'void':
      case 'uncollectible':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invoices</CardTitle>
        <CardDescription>Your billing history. Click to download PDF.</CardDescription>
      </CardHeader>
      <CardContent>
        {invoicesQuery.isPending ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : invs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-fg-subtle">
                  <th className="pb-2 pr-4">Number</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Period</th>
                  <th className="pb-2">PDF</th>
                </tr>
              </thead>
              <tbody>
                {invs.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-border/30 hover:bg-bg-subtle/30 transition-colors"
                  >
                    <td className="py-3 pr-4 font-mono text-xs">{inv.number ?? '—'}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={statusColor(inv.status) as any}>{inv.status}</Badge>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      ${(inv.totalCents / 100).toFixed(2)} {inv.currency.toUpperCase()}
                    </td>
                    <td className="py-3 pr-4 text-xs text-fg-muted">
                      {inv.periodStart ? new Date(inv.periodStart).toLocaleDateString() : '—'}
                      {' → '}
                      {inv.periodEnd ? new Date(inv.periodEnd).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3">
                      {inv.pdfUrl ? (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-fg-subtle">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">No invoices yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
