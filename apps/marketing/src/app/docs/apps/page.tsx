import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Apps & Sites',
  description: 'Build, deploy, and manage apps and sites on Absolo Cloud.',
};

export default function AppsDocsPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">Apps & Sites</h1>
      <p className="mt-4 text-lg text-fg-muted">
        Everything you need to know about deploying and managing applications.
      </p>

      <div className="mt-12 prose prose-invert max-w-none text-fg-muted space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-fg">Build Detection</h2>
          <p>Absolo auto-detects your build system. We support:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Dockerfile</strong> — If a <code>Dockerfile</code> exists, we build it
              directly.
            </li>
            <li>
              <strong>Buildpacks</strong> — For Node.js, Python, Go, Ruby, and PHP projects without
              a Dockerfile.
            </li>
            <li>
              <strong>Static</strong> — For frameworks that output static HTML (Astro, Hugo, etc.).
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-fg">Deployment Strategies</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Rolling</strong> — Default. New pods are created before old ones are drained.
            </li>
            <li>
              <strong>Blue/Green</strong> — Full parallel deployment with instant traffic switch.
            </li>
            <li>
              <strong>Canary</strong> — Route a percentage of traffic to the new version. Available
              on Pro+.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-fg">Rollbacks</h2>
          <p>
            Every deployment creates a versioned snapshot. Roll back to any previous version
            instantly from the dashboard or CLI:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border/60 bg-bg-subtle p-4 font-mono text-sm text-fg">
            {`npx @absolo/cli rollback --app my-app --version v3`}
          </pre>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-fg">Environment Variables</h2>
          <p>
            Set env vars per environment (production, staging). Bound database and storage
            credentials are auto-injected as <code>DATABASE_URL</code>, <code>REDIS_URL</code>,{' '}
            <code>S3_ENDPOINT</code>, etc.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-fg">Custom Domains & SSL</h2>
          <p>
            Add custom domains in the dashboard. Point a CNAME to <code>ingress.absolo.cloud</code>.
            SSL certificates are auto-provisioned via cert-manager and renewed before expiry.
          </p>
        </div>
      </div>
    </section>
  );
}
