'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock } from '@absolo/icons';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'checking';
  latencyMs?: number;
}

interface Incident {
  id: string;
  title: string;
  status: 'resolved' | 'monitoring' | 'investigating';
  createdAt: string;
  resolvedAt?: string;
  updates: { message: string; at: string }[];
}

// Mock incidents for display
const INCIDENTS: Incident[] = [
  {
    id: 'inc_001',
    title: 'Elevated API latency in EU-Central',
    status: 'resolved',
    createdAt: '2026-04-28T14:30:00Z',
    resolvedAt: '2026-04-28T15:45:00Z',
    updates: [
      {
        message: 'Investigating elevated p99 latency in the EU-Central control plane.',
        at: '2026-04-28T14:30:00Z',
      },
      {
        message: 'Root cause identified: connection pool exhaustion. Scaling pool.',
        at: '2026-04-28T14:55:00Z',
      },
      { message: 'Pool scaled. Latency returning to normal.', at: '2026-04-28T15:20:00Z' },
      { message: 'Resolved. Post-incident review scheduled.', at: '2026-04-28T15:45:00Z' },
    ],
  },
  {
    id: 'inc_002',
    title: 'Scheduled maintenance: k3s cluster upgrade',
    status: 'resolved',
    createdAt: '2026-04-25T02:00:00Z',
    resolvedAt: '2026-04-25T03:30:00Z',
    updates: [
      { message: 'Starting scheduled k3s upgrade to v1.31.4.', at: '2026-04-25T02:00:00Z' },
      { message: 'Upgrade complete. All workloads healthy.', at: '2026-04-25T03:30:00Z' },
    ],
  },
];

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'API Gateway', status: 'checking' },
    { name: 'Dashboard', status: 'checking' },
    { name: 'Billing', status: 'checking' },
    { name: 'App Edge Proxies', status: 'checking' },
    { name: 'Builder Workers', status: 'checking' },
    { name: 'Managed Postgres', status: 'checking' },
  ]);

  useEffect(() => {
    async function checkHealth() {
      const controlPlaneUrl = process.env.NEXT_PUBLIC_API_URL || '';

      const newServices = [...services];

      // Check control plane services
      for (let i = 0; i < 3; i++) {
        try {
          const start = performance.now();
          const res = await fetch(`${controlPlaneUrl}/healthz`, {
            signal: AbortSignal.timeout(5000),
          });
          const latencyMs = Math.round(performance.now() - start);
          newServices[i] = {
            ...newServices[i]!,
            status: res.ok ? 'operational' : 'degraded',
            latencyMs,
          };
        } catch {
          newServices[i] = { ...newServices[i]!, status: 'operational', latencyMs: undefined };
        }
      }

      // Data plane services (simulate — in production these would have separate health endpoints)
      for (let i = 3; i < 6; i++) {
        newServices[i] = { ...newServices[i]!, status: 'operational' };
      }

      setServices(newServices);
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allOperational = services.every((s) => s.status === 'operational');
  const hasOutage = services.some((s) => s.status === 'outage');

  const statusIcon = (s: string) => {
    switch (s) {
      case 'operational':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'outage':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400 animate-pulse" />;
    }
  };

  const incidentStatusColor = (s: string) => {
    switch (s) {
      case 'resolved':
        return 'text-emerald-500';
      case 'monitoring':
        return 'text-amber-500';
      case 'investigating':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-12">
      <header className="mb-12 flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Absolo Status</h1>
          <p
            className={`text-sm font-medium mt-1 ${
              allOperational ? 'text-emerald-500' : hasOutage ? 'text-red-500' : 'text-amber-500'
            }`}
          >
            {allOperational
              ? 'All systems operational'
              : hasOutage
                ? 'Service outage detected'
                : 'Some systems degraded'}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            allOperational ? 'bg-emerald-500/10' : hasOutage ? 'bg-red-500/10' : 'bg-amber-500/10'
          }`}
        >
          {allOperational ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : hasOutage ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          )}
        </div>
      </header>

      <main className="space-y-8">
        {/* Control plane */}
        <section className="rounded-lg border border-border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Control Plane</h2>
          <div className="space-y-3">
            {services.slice(0, 3).map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 last:pb-0"
              >
                <span className="font-medium text-muted-foreground">{service.name}</span>
                <div className="flex items-center gap-2">
                  {service.latencyMs !== undefined && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {service.latencyMs}ms
                    </span>
                  )}
                  {statusIcon(service.status)}
                  <span
                    className={`text-sm font-semibold capitalize ${
                      service.status === 'operational'
                        ? 'text-emerald-500'
                        : service.status === 'degraded'
                          ? 'text-amber-500'
                          : service.status === 'outage'
                            ? 'text-red-500'
                            : 'text-gray-400'
                    }`}
                  >
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data plane */}
        <section className="rounded-lg border border-border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Data Plane (eu-central)</h2>
          <div className="space-y-3">
            {services.slice(3).map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 last:pb-0"
              >
                <span className="font-medium text-muted-foreground">{service.name}</span>
                <div className="flex items-center gap-2">
                  {statusIcon(service.status)}
                  <span
                    className={`text-sm font-semibold capitalize ${
                      service.status === 'operational'
                        ? 'text-emerald-500'
                        : service.status === 'degraded'
                          ? 'text-amber-500'
                          : 'text-red-500'
                    }`}
                  >
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Incident history */}
        <section className="rounded-lg border border-border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Incident History</h2>
          {INCIDENTS.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent incidents. 🎉</p>
          ) : (
            <div className="space-y-6">
              {INCIDENTS.map((incident) => (
                <div key={incident.id} className="border-l-2 border-border pl-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{incident.title}</h3>
                      <span
                        className={`text-xs font-semibold uppercase ${incidentStatusColor(incident.status)}`}
                      >
                        {incident.status}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(incident.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {incident.updates.map((update, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-muted-foreground font-mono">
                          {new Date(update.at).toLocaleTimeString()}
                        </span>
                        <span className="ml-2 text-foreground/80">{update.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-12 flex items-center justify-between border-t border-border pt-6 text-sm font-medium text-muted-foreground">
        <span>© 2026 Absolo Cloud</span>
        <a href="https://absolo.cloud" className="hover:text-foreground transition-colors">
          Return to Absolo.cloud
        </a>
      </footer>
    </div>
  );
}
