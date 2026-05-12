import { useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@absolo/ui';
import { Search, Users, Ban, Eye } from '@absolo/icons';

// Mock org data — replaced with real data once admin IAM API ships
const MOCK_ORGS = [
  {
    id: 'org_01HZX9A001',
    name: 'Acme Corp',
    slug: 'acme-corp',
    plan: 'pro',
    mrrCents: 24900,
    members: 5,
    projects: 12,
    status: 'active',
    createdAt: '2025-11-15T10:00:00Z',
  },
  {
    id: 'org_01HZX9A002',
    name: 'Stealth Startup Inc.',
    slug: 'stealth-startup',
    plan: 'payg',
    mrrCents: 8750,
    members: 2,
    projects: 3,
    status: 'active',
    createdAt: '2026-01-22T14:30:00Z',
  },
  {
    id: 'org_01HZX9A003',
    name: 'Widget Factory',
    slug: 'widget-factory',
    plan: 'free',
    mrrCents: 0,
    members: 1,
    projects: 1,
    status: 'active',
    createdAt: '2026-03-01T08:15:00Z',
  },
  {
    id: 'org_01HZX9A004',
    name: 'Cryptominer LLC',
    slug: 'cryptominer',
    plan: 'payg',
    mrrCents: 0,
    members: 1,
    projects: 8,
    status: 'suspended',
    createdAt: '2026-04-10T02:00:00Z',
  },
  {
    id: 'org_01HZX9A005',
    name: 'DevShop Agency',
    slug: 'devshop',
    plan: 'team',
    mrrCents: 49900,
    members: 14,
    projects: 27,
    status: 'active',
    createdAt: '2025-12-05T17:45:00Z',
  },
];

export function OrgsPage() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_ORGS.filter(
    (org) =>
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.slug.toLowerCase().includes(search.toLowerCase()) ||
      org.id.includes(search),
  );

  const planColor = (p: string) => {
    switch (p) {
      case 'pro':
      case 'team':
        return 'bg-brand-500/10 text-brand-600';
      case 'payg':
        return 'bg-success-500/10 text-success-600';
      default:
        return 'bg-bg-muted text-fg-muted';
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-6">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">organisations</h1>
        <p className="mt-1 font-mono text-xs text-fg-muted">
          search, suspend, impersonate (audited)
        </p>
      </header>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard label="total orgs" value={String(MOCK_ORGS.length)} />
        <StatCard
          label="active"
          value={String(MOCK_ORGS.filter((o) => o.status === 'active').length)}
        />
        <StatCard
          label="suspended"
          value={String(MOCK_ORGS.filter((o) => o.status === 'suspended').length)}
        />
        <StatCard
          label="total MRR"
          value={`$${(MOCK_ORGS.reduce((s, o) => s + o.mrrCents, 0) / 100).toLocaleString()}`}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="font-mono text-base">all orgs</CardTitle>
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
            <Input
              placeholder="Search by name, slug, or ID…"
              className="pl-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-left font-mono uppercase tracking-wider text-fg-subtle">
                  <th className="pb-2 pr-4">name</th>
                  <th className="pb-2 pr-4">slug</th>
                  <th className="pb-2 pr-4">plan</th>
                  <th className="pb-2 pr-4">MRR</th>
                  <th className="pb-2 pr-4">members</th>
                  <th className="pb-2 pr-4">projects</th>
                  <th className="pb-2 pr-4">status</th>
                  <th className="pb-2 pr-4">created</th>
                  <th className="pb-2">actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((org) => (
                  <tr
                    key={org.id}
                    className="border-b border-border/30 hover:bg-bg-subtle/30 transition-colors"
                  >
                    <td className="py-2.5 pr-4 font-medium text-fg">
                      <span className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-fg-subtle" />
                        {org.name}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-fg-muted">{org.slug}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${planColor(org.plan)}`}
                      >
                        {org.plan}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-fg">
                      ${(org.mrrCents / 100).toFixed(2)}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-fg-muted">{org.members}</td>
                    <td className="py-2.5 pr-4 font-mono text-fg-muted">{org.projects}</td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        variant={org.status === 'active' ? 'success' : 'destructive'}
                        className="text-[10px]"
                      >
                        {org.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-fg-muted">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 font-mono text-[10px]"
                          title="Impersonate"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 font-mono text-[10px] text-destructive hover:text-destructive"
                          title="Suspend"
                        >
                          <Ban className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-bg-elevated p-4">
      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{label}</span>
      <div className="mt-2 font-mono text-2xl font-semibold text-fg">{value}</div>
    </div>
  );
}
