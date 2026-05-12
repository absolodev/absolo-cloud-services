import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Reference',
  description: 'Full Absolo Cloud REST API reference — every endpoint, every schema.',
};

const ENDPOINTS = [
  {
    group: 'Projects',
    routes: [
      { method: 'GET', path: '/v1/projects', desc: 'List projects for an organisation' },
      { method: 'POST', path: '/v1/projects', desc: 'Create a new project' },
      { method: 'GET', path: '/v1/projects/:id', desc: 'Get project by ID' },
      { method: 'PATCH', path: '/v1/projects/:id', desc: 'Update a project' },
      { method: 'DELETE', path: '/v1/projects/:id', desc: 'Archive a project' },
    ],
  },
  {
    group: 'Apps',
    routes: [
      { method: 'GET', path: '/v1/projects/:id/apps', desc: 'List apps in a project' },
      { method: 'POST', path: '/v1/projects/:id/apps', desc: 'Create a new app' },
      { method: 'GET', path: '/v1/apps/:id', desc: 'Get app details' },
      { method: 'POST', path: '/v1/apps/:id/deploy', desc: 'Trigger a deployment' },
      { method: 'POST', path: '/v1/apps/:id/rollback', desc: 'Roll back to a previous version' },
    ],
  },
  {
    group: 'Databases',
    routes: [
      { method: 'GET', path: '/v1/projects/:id/databases', desc: 'List managed databases' },
      { method: 'POST', path: '/v1/projects/:id/databases', desc: 'Provision a new database' },
      { method: 'GET', path: '/v1/databases/:id', desc: 'Get database details' },
      { method: 'DELETE', path: '/v1/databases/:id', desc: 'Deprovision a database' },
    ],
  },
  {
    group: 'Storage',
    routes: [
      { method: 'GET', path: '/v1/projects/:id/buckets', desc: 'List storage buckets' },
      { method: 'POST', path: '/v1/projects/:id/buckets', desc: 'Create a bucket' },
      { method: 'GET', path: '/v1/buckets/:id', desc: 'Get bucket details' },
      { method: 'DELETE', path: '/v1/buckets/:id', desc: 'Delete a bucket' },
    ],
  },
  {
    group: 'Billing',
    routes: [
      { method: 'GET', path: '/v1/billing/subscription', desc: 'Get current subscription' },
      { method: 'GET', path: '/v1/billing/spend', desc: 'Get current period spend' },
      { method: 'GET', path: '/v1/billing/invoices', desc: 'List invoices' },
      { method: 'PUT', path: '/v1/billing/spend-cap', desc: 'Set spend cap' },
    ],
  },
  {
    group: 'Platform',
    routes: [
      { method: 'GET', path: '/v1/regions', desc: 'List available regions' },
      { method: 'GET', path: '/v1/regions/:code', desc: 'Get region details' },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-600',
  POST: 'bg-blue-500/10 text-blue-600',
  PUT: 'bg-amber-500/10 text-amber-600',
  PATCH: 'bg-amber-500/10 text-amber-600',
  DELETE: 'bg-red-500/10 text-red-600',
};

export default function ApiReferencePage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">API Reference</h1>
      <p className="mt-4 text-lg text-fg-muted">
        Every endpoint is defined by a Zod schema in{' '}
        <code className="rounded bg-bg-muted px-1.5 py-0.5 font-mono text-sm">
          @absolo/contracts
        </code>
        . The same schemas power server-side validation and the TypeScript SDK.
      </p>

      <div className="mt-12 space-y-10">
        {ENDPOINTS.map((group) => (
          <div key={group.group}>
            <h2 className="text-xl font-semibold tracking-tight border-b border-border/60 pb-2">
              {group.group}
            </h2>
            <div className="mt-4 space-y-2">
              {group.routes.map((route) => (
                <div
                  key={`${route.method} ${route.path}`}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-bg-elevated px-4 py-3"
                >
                  <span
                    className={`inline-flex w-16 justify-center rounded px-2 py-0.5 font-mono text-xs font-bold ${METHOD_COLORS[route.method] ?? ''}`}
                  >
                    {route.method}
                  </span>
                  <code className="font-mono text-sm text-fg">{route.path}</code>
                  <span className="ml-auto text-xs text-fg-subtle">{route.desc}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
