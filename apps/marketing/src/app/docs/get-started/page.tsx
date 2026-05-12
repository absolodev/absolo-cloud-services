import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Started',
  description: 'Deploy your first app on Absolo Cloud in under 5 minutes.',
};

export default function GetStartedPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">Get Started</h1>
      <p className="mt-4 text-lg text-fg-muted">From zero to a deployed app in five minutes.</p>

      <div className="mt-12 space-y-10">
        <Step n={1} title="Create your account">
          <p>
            Sign up at{' '}
            <code className="rounded bg-bg-muted px-1.5 py-0.5 font-mono text-xs">
              app.absolo.cloud/sign-up
            </code>
            . No credit card required for the free tier.
          </p>
        </Step>

        <Step n={2} title="Create a project">
          <p>
            Click <strong>New project</strong> from the dashboard. Pick a name, slug, and region.
            Your project is the container for apps, databases, and buckets.
          </p>
        </Step>

        <Step n={3} title="Deploy your first app">
          <p>
            Connect your Git repository or use one of our templates (Next.js, Laravel, WordPress).
            Absolo auto-detects your build system and deploys.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border/60 bg-bg-subtle p-4 font-mono text-sm">
            {`# Or use the CLI
npx @absolo/cli deploy --project my-app`}
          </pre>
        </Step>

        <Step n={4} title="Add a database (optional)">
          <p>
            Go to <strong>Databases → Create</strong>. Pick Postgres, MySQL, or Redis. Once
            provisioned, bind it to your app and connection strings are auto-injected as environment
            variables.
          </p>
        </Step>

        <Step n={5} title="Attach a custom domain">
          <p>
            In your app settings, add your domain and point a CNAME to{' '}
            <code className="rounded bg-bg-muted px-1.5 py-0.5 font-mono text-xs">
              ingress.absolo.cloud
            </code>
            . SSL is provisioned automatically via cert-manager.
          </p>
        </Step>
      </div>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
        {n}
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <div className="mt-2 text-sm text-fg-muted leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
