import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'What is new in Absolo Cloud — release notes, improvements, and fixes.',
};

const ENTRIES = [
  {
    version: 'v0.4.0',
    date: 'Oct 12, 2026',
    title: 'Multi-region support',
    changes: [
      'Added eu-fra, us-iad, and apac-sg regions',
      'Dynamic region selection in project, database, and bucket creation',
      'Platform API: GET /v1/regions for region discovery',
    ],
  },
  {
    version: 'v0.3.0',
    date: 'Sep 30, 2026',
    title: 'Managed databases & object storage',
    changes: [
      'Managed Postgres (CloudNativePG), MySQL (Percona), and Redis',
      'S3-compatible object storage via SeaweedFS',
      'Resource bindings with auto-injected env vars',
      'Dashboard pages for database and bucket management',
    ],
  },
  {
    version: 'v0.2.0',
    date: 'Sep 15, 2026',
    title: 'Billing & snapshots',
    changes: [
      'Stripe-based hourly metering for compute and storage',
      'Spend cap controls with hard-stop enforcement',
      'Invoice history and PDF downloads',
      'Snapshot and restore for persistent volumes',
    ],
  },
  {
    version: 'v0.1.0',
    date: 'Aug 28, 2026',
    title: 'Initial beta',
    changes: [
      'Project and app lifecycle management',
      'Deploy from Dockerfile or buildpack',
      'Free subdomain with automatic SSL',
      'Dashboard with project overview and environment management',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Changelog</h1>
        <p className="mt-4 text-lg text-fg-muted">
          Every release, improvement, and fix — documented here.
        </p>
      </div>

      <div className="mt-14 space-y-10">
        {ENTRIES.map((entry) => (
          <article key={entry.version} className="relative border-l-2 border-border pl-6">
            <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-brand-500 bg-background" />
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm font-semibold text-brand-600">
                {entry.version}
              </span>
              <time className="text-xs text-fg-subtle">{entry.date}</time>
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">{entry.title}</h2>
            <ul className="mt-3 space-y-1.5">
              {entry.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-fg-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-brand-500/60" />
                  {change}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
