import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@absolo/ui';
import { Activity, DollarSign, Rocket, Server, Users, TrendingUp } from '@absolo/icons';

// Mock recent signups
const RECENT_SIGNUPS = [
  { id: 'org_01A', name: 'Acme Corp', email: 'admin@acme.io', plan: 'pro', at: '2 hours ago' },
  { id: 'org_01B', name: 'Indie Dev', email: 'dev@indie.app', plan: 'free', at: '5 hours ago' },
  {
    id: 'org_01C',
    name: 'DevShop Agency',
    email: 'ops@devshop.io',
    plan: 'team',
    at: '8 hours ago',
  },
  {
    id: 'org_01D',
    name: 'SaaSBuilder',
    email: 'hello@saas.build',
    plan: 'payg',
    at: '14 hours ago',
  },
];

// Mock recent deploys
const RECENT_DEPLOYS = [
  {
    id: 'dep_01',
    app: 'next-storefront',
    org: 'acme-corp',
    status: 'live',
    version: 'v3',
    at: '12 min ago',
  },
  {
    id: 'dep_02',
    app: 'api-gateway',
    org: 'devshop',
    status: 'building',
    version: 'v7',
    at: '25 min ago',
  },
  {
    id: 'dep_03',
    app: 'wp-blog',
    org: 'indie-dev',
    status: 'live',
    version: 'v1',
    at: '1 hour ago',
  },
  {
    id: 'dep_04',
    app: 'laravel-app',
    org: 'saas-builder',
    status: 'failed',
    version: 'v2',
    at: '2 hours ago',
  },
];

/**
 * High-density overview — platform-wide KPIs.
 *
 * Real metrics arrive once the billing and orchestrator modules ship;
 * the cards use mock data to demonstrate the layout.
 */
export function OverviewPage() {
  const readyQuery = useQuery({
    queryKey: ['admin', 'ready'],
    queryFn: async () => {
      const res = await fetch('/readyz');
      return { ok: res.ok, status: res.status };
    },
    refetchInterval: 10_000,
  });

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-8">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">overview</h1>
        <p className="mt-1 font-mono text-xs text-fg-muted">platform health · last 24h</p>
      </header>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Stat
          icon={Activity}
          label="control-plane"
          value={readyQuery.data?.ok ? 'ready' : readyQuery.isLoading ? '…' : 'down'}
          tone={readyQuery.data?.ok ? 'ok' : readyQuery.isLoading ? 'idle' : 'bad'}
        />
        <Stat icon={Users} label="active orgs" value="47" tone="ok" />
        <Stat icon={DollarSign} label="MRR" value="$12,480" tone="ok" />
        <Stat icon={Server} label="active pods" value="1,045" tone="ok" />
        <Stat icon={TrendingUp} label="deploys (24h)" value="83" tone="ok" />
      </div>

      {/* Content row */}
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {/* Recent signups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono text-base">
              <Users className="h-4 w-4" />
              recent signups
            </CardTitle>
            <CardDescription>Last 24 hours.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {RECENT_SIGNUPS.map((signup) => (
                <div
                  key={signup.id}
                  className="flex items-center justify-between rounded-md border border-border/30 px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-fg">{signup.name}</span>
                    <span className="ml-2 font-mono text-[11px] text-fg-subtle">
                      {signup.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        signup.plan === 'pro' || signup.plan === 'team'
                          ? 'bg-brand-500/10 text-brand-600'
                          : signup.plan === 'payg'
                            ? 'bg-success-500/10 text-success-600'
                            : 'bg-bg-muted text-fg-muted'
                      }`}
                    >
                      {signup.plan}
                    </span>
                    <span className="font-mono text-[10px] text-fg-subtle">{signup.at}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent deploys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono text-base">
              <Rocket className="h-4 w-4" />
              recent deploys
            </CardTitle>
            <CardDescription>Last 24 hours.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {RECENT_DEPLOYS.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between rounded-md border border-border/30 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        dep.status === 'live'
                          ? 'success'
                          : dep.status === 'failed'
                            ? 'destructive'
                            : ('warning' as any)
                      }
                      className="text-[10px]"
                    >
                      {dep.status}
                    </Badge>
                    <span className="text-sm font-medium text-fg">{dep.app}</span>
                    <span className="font-mono text-[11px] text-fg-subtle">{dep.version}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-fg-muted">{dep.org}</span>
                    <span className="font-mono text-[10px] text-fg-subtle">{dep.at}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: 'ok' | 'bad' | 'idle';
}) {
  const toneClass =
    tone === 'ok' ? 'text-success-600' : tone === 'bad' ? 'text-danger-600' : 'text-fg-subtle';
  return (
    <div className="rounded-lg border border-border/70 bg-bg-elevated p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-fg-subtle" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {label}
        </span>
      </div>
      <div className={`mt-2 font-mono text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
