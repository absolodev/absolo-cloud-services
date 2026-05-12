import { useState } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle, Input } from '@absolo/ui';
import { Search, FileText, Shield, User, Globe } from '@absolo/icons';

// Mock audit log data
const MOCK_AUDIT_LOG = [
  {
    id: 'aud_001',
    timestamp: '2026-04-30T21:15:32Z',
    actor: 'admin@absolo.cloud',
    actorKind: 'staff',
    action: 'org.suspend',
    resource: 'org_01HZX9A004 (cryptominer)',
    ip: '10.0.0.15',
    details: 'Suspended for TOS violation (crypto mining detected)',
  },
  {
    id: 'aud_002',
    timestamp: '2026-04-30T20:45:11Z',
    actor: 'ops@absolo.cloud',
    actorKind: 'staff',
    action: 'host.drain',
    resource: 'htz-fsn1-node-06',
    ip: '10.0.0.12',
    details: 'Draining for scheduled maintenance',
  },
  {
    id: 'aud_003',
    timestamp: '2026-04-30T19:30:05Z',
    actor: 'admin@absolo.cloud',
    actorKind: 'staff',
    action: 'billing.credit.add',
    resource: 'org_01HZX9A001 (acme-corp)',
    ip: '10.0.0.15',
    details: 'Comp credit $50.00 for outage compensation',
  },
  {
    id: 'aud_004',
    timestamp: '2026-04-30T18:12:44Z',
    actor: 'system',
    actorKind: 'system',
    action: 'deployment.rollback',
    resource: 'app_01JXK_next-storefront (v2 → v1)',
    ip: '—',
    details: 'Auto-rollback triggered: health check failed 3x',
  },
  {
    id: 'aud_005',
    timestamp: '2026-04-30T16:55:20Z',
    actor: 'admin@absolo.cloud',
    actorKind: 'staff',
    action: 'org.impersonate',
    resource: 'org_01HZX9A002 (stealth-startup)',
    ip: '10.0.0.15',
    details: 'Support ticket #4521 — investigating deployment failure',
  },
  {
    id: 'aud_006',
    timestamp: '2026-04-30T15:20:01Z',
    actor: 'system',
    actorKind: 'system',
    action: 'cert.renewed',
    resource: 'custom-domain: api.acmecorp.com',
    ip: '—',
    details: "Let's Encrypt certificate renewed (valid 90d)",
  },
  {
    id: 'aud_007',
    timestamp: '2026-04-30T14:05:33Z',
    actor: 'ops@absolo.cloud',
    actorKind: 'staff',
    action: 'region.provision',
    resource: 'us-east (Ashburn)',
    ip: '10.0.0.12',
    details: 'Initiated region provisioning via tofu apply',
  },
  {
    id: 'aud_008',
    timestamp: '2026-04-30T12:00:00Z',
    actor: 'system',
    actorKind: 'system',
    action: 'billing.dunning.advance',
    resource: 'org_01HZX9A004 (cryptominer)',
    ip: '—',
    details: 'Dunning advanced to level 3 (suspend non-prod)',
  },
];

export function AuditPage() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_AUDIT_LOG.filter(
    (entry) =>
      entry.action.includes(search.toLowerCase()) ||
      entry.actor.includes(search.toLowerCase()) ||
      entry.resource.toLowerCase().includes(search.toLowerCase()) ||
      entry.details.toLowerCase().includes(search.toLowerCase()),
  );

  const actionColor = (action: string) => {
    if (action.includes('suspend') || action.includes('dunning')) return 'destructive';
    if (action.includes('impersonate')) return 'warning';
    if (action.includes('deploy') || action.includes('rollback')) return 'secondary';
    if (action.includes('credit') || action.includes('renewed') || action.includes('provision'))
      return 'success';
    return 'outline';
  };

  const actorIcon = (kind: string) => {
    switch (kind) {
      case 'staff':
        return <Shield className="h-3 w-3 text-destructive" />;
      case 'system':
        return <Globe className="h-3 w-3 text-fg-subtle" />;
      default:
        return <User className="h-3 w-3 text-fg-subtle" />;
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-6">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">audit log</h1>
        <p className="mt-1 font-mono text-xs text-fg-muted">immutable, queryable, exportable</p>
      </header>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="flex items-center gap-2 font-mono text-base">
            <FileText className="h-4 w-4" />
            events ({filtered.length})
          </CardTitle>
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
            <Input
              placeholder="Filter by action, actor, or resource…"
              className="pl-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {filtered.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-start gap-4 rounded-md border border-border/30 px-4 py-3 transition-colors hover:bg-bg-subtle/30"
              >
                <div className="mt-0.5">{actorIcon(entry.actorKind)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={actionColor(entry.action) as any}
                      className="text-[10px] font-mono"
                    >
                      {entry.action}
                    </Badge>
                    <span className="font-mono text-[11px] text-fg-muted">{entry.actor}</span>
                    <span className="text-[10px] text-fg-subtle">·</span>
                    <span className="font-mono text-[10px] text-fg-subtle">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-fg-muted truncate">{entry.resource}</p>
                  <p className="mt-0.5 text-[11px] text-fg-subtle">{entry.details}</p>
                </div>
                <span className="font-mono text-[10px] text-fg-subtle whitespace-nowrap">
                  {entry.ip}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
