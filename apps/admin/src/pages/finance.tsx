import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@absolo/ui';
import { DollarSign, TrendingUp, AlertCircle } from '@absolo/icons';

const MOCK_INVOICES = [
  { id: 'inv_1', org: 'org_acme_corp', amount: '$4,250.00', status: 'paid', date: 'Oct 1, 2026' },
  { id: 'inv_2', org: 'org_startup_x', amount: '$150.00', status: 'failed', date: 'Oct 1, 2026' },
  { id: 'inv_3', org: 'org_dev_shop', amount: '$890.50', status: 'paid', date: 'Oct 1, 2026' },
];

export function FinancePage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-6">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-success-600">
          finance & billing
        </h1>
        <p className="mt-1 font-mono text-xs text-fg-muted">
          mrr · collections · disputes · stripe sync
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-fg-subtle">MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono text-success">$142,500</div>
            <p className="text-xs text-success flex items-center mt-1">
              <TrendingUp className="mr-1 h-3 w-3" /> +12% MoM
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-fg-subtle">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono">1,842</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-fg-subtle">Failed Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono text-destructive">$3,400</div>
            <p className="text-xs text-fg-muted mt-1">14 accounts in dunning</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-fg-subtle">Stripe Webhook Lag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono text-success">1.2s</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success" />
              Recent Large Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-fg-subtle border-b border-border">
                <tr>
                  <th className="pb-2 font-medium">Invoice ID</th>
                  <th className="pb-2 font-medium">Organization</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {MOCK_INVOICES.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-3 font-mono text-xs">{inv.id}</td>
                    <td className="py-3 font-mono text-xs">{inv.org}</td>
                    <td className="py-3 font-mono text-xs">{inv.amount}</td>
                    <td className="py-3 text-right">
                      <Badge variant={inv.status === 'paid' ? 'success' : 'destructive'}>
                        {inv.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              Pending Dual-Control Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-fg">Refund Request &gt; $500</h4>
                <p className="text-xs text-fg-muted mt-1">
                  Admin <span className="font-mono">alice@absolo.app</span> requested a refund of
                  $850 for <span className="font-mono">org_spammers</span>. Requires second
                  approver.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline">
                    Approve
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive">
                    Deny
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
