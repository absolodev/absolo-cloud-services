import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@absolo/ui';
import { api } from '@/lib/api';

/**
 * High-density overview \u2014 platform-wide KPIs.
 *
 * Phase 0 only the readiness check is real. Real metrics arrive once the
 * billing and orchestrator modules ship; the cards reserve the layout.
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
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          overview
        </h1>
        <p className="mt-1 font-mono text-xs text-fg-muted">
          platform health \u00b7 last 24h
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="control-plane"
          value={readyQuery.data?.ok ? 'ready' : readyQuery.isLoading ? '\u2026' : 'down'}
          tone={readyQuery.data?.ok ? 'ok' : readyQuery.isLoading ? 'idle' : 'bad'}
        />
        <Stat label="active orgs" value="\u2014" tone="idle" />
        <Stat label="open incidents" value="0" tone="ok" />
      </div>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-base">recent signups</CardTitle>
            <CardDescription>
              Streams in once the IAM module ships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-xs text-fg-subtle">no data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-base">recent deploys</CardTitle>
            <CardDescription>
              Streams in once the orchestrator ships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-xs text-fg-subtle">no data</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'ok' | 'bad' | 'idle';
}) {
  const toneClass =
    tone === 'ok'
      ? 'text-success-600'
      : tone === 'bad'
        ? 'text-danger-600'
        : 'text-fg-subtle';
  return (
    <div className="rounded-lg border border-border/70 bg-bg-elevated p-4">
      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
      </span>
      <div className={`mt-2 font-mono text-2xl font-semibold ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
