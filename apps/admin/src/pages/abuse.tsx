import { useState } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle, Button } from '@absolo/ui';
import { AlertTriangle, Shield, Ban, CheckCircle2 } from '@absolo/icons';

const MOCK_SIGNALS = [
  {
    id: 'sig_1',
    org: 'org_crypto_bros',
    type: 'cryptomining_heuristic',
    score: 98,
    status: 'flagged',
    time: '10m ago',
  },
  {
    id: 'sig_2',
    org: 'org_spammers',
    type: 'outbound_smtp_spike',
    score: 95,
    status: 'quarantined',
    time: '1h ago',
  },
  {
    id: 'sig_3',
    org: 'org_ddos_target',
    type: 'inbound_traffic_spike',
    score: 80,
    status: 'investigating',
    time: '2h ago',
  },
  {
    id: 'sig_4',
    org: 'org_legit_startup',
    type: 'cpu_sustained_max',
    score: 60,
    status: 'cleared',
    time: '1d ago',
  },
];

export function AbusePage() {
  const [signals, setSignals] = useState(MOCK_SIGNALS);

  const handleAction = (id: string, action: string) => {
    setSignals(signals.map((s) => (s.id === id ? { ...s, status: action } : s)));
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-6">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-destructive">
          abuse & signals
        </h1>
        <p className="mt-1 font-mono text-xs text-fg-muted">
          automated heuristic flags · manual reviews · dual-control actions
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-fg-subtle">Active Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono text-destructive">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-fg-subtle">Auto-Quarantined</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono text-warning">4</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-fg-subtle">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono">8</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-fg-subtle">Cleared (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono text-success">45</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Recent Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-fg-subtle border-b border-border">
              <tr>
                <th className="pb-2 font-medium">Signal ID</th>
                <th className="pb-2 font-medium">Organization</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Score</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {signals.map((sig) => (
                <tr key={sig.id}>
                  <td className="py-3 font-mono text-xs">{sig.id}</td>
                  <td className="py-3 font-mono text-xs">{sig.org}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      {sig.score > 90 && <Shield className="h-3.5 w-3.5 text-destructive" />}
                      {sig.type}
                    </div>
                  </td>
                  <td className="py-3 font-mono text-xs">
                    <span className={sig.score > 90 ? 'text-destructive font-bold' : ''}>
                      {sig.score}
                    </span>
                    /100
                  </td>
                  <td className="py-3">
                    <Badge
                      variant={
                        sig.status === 'cleared'
                          ? 'success'
                          : sig.status === 'flagged'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {sig.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right">
                    {sig.status !== 'cleared' && sig.status !== 'quarantined' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleAction(sig.id, 'cleared')}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Clear
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => handleAction(sig.id, 'quarantined')}
                        >
                          <Ban className="mr-1 h-3 w-3" /> Quarantine
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
