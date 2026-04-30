import { CheckCircle2 } from '@absolo/icons';

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-12">
      <header className="mb-12 flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Absolo Status</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">All systems operational</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        </div>
      </header>

      <main className="space-y-8">
        <section className="rounded-lg border border-border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Control Plane</h2>
          <div className="space-y-3">
            {[
              { name: 'API Gateway', status: 'Operational' },
              { name: 'Dashboard', status: 'Operational' },
              { name: 'Billing', status: 'Operational' },
            ].map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 last:pb-0"
              >
                <span className="font-medium text-muted-foreground">{service.name}</span>
                <span className="text-sm font-semibold text-emerald-500">{service.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Data Plane (eu-central)</h2>
          <div className="space-y-3">
            {[
              { name: 'App Edge Proxies', status: 'Operational' },
              { name: 'Builder Workers', status: 'Operational' },
              { name: 'Managed Postgres', status: 'Operational' },
            ].map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 last:pb-0"
              >
                <span className="font-medium text-muted-foreground">{service.name}</span>
                <span className="text-sm font-semibold text-emerald-500">{service.status}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-12 flex items-center justify-between border-t border-border pt-6 text-sm font-medium text-muted-foreground">
        <span>\u00a9 2026 Absolo Cloud</span>
        <a href="https://absolo.cloud" className="hover:text-foreground transition-colors">
          Return to Absolo.cloud
        </a>
      </footer>
    </div>
  );
}
