import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  Database,
  Cloud,
  Globe2,
  ShieldCheck,
  Zap,
} from '@absolo/icons';

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeatureGrid />
      <Cta />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(56,189,248,0.18),transparent)]" />
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 md:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-bg-elevated px-3 py-1 text-xs font-medium text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
            Public beta — EU-Central
          </span>
          <h1 className="mt-6 text-balance text-5xl font-semibold leading-tight tracking-tight text-fg md:text-6xl">
            Deploys that are <span className="text-brand-500">boring on purpose</span>.
          </h1>
          <p className="mt-6 text-pretty text-lg leading-relaxed text-fg-muted md:text-xl">
            A modern PaaS with managed Postgres, S3-compatible buckets, multi-region
            failover and pricing that actually predicts your bill. Open contracts,
            no lock-in tax.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="https://app.absolo.cloud/sign-up"
              className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-5 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-md border border-border/80 bg-bg-elevated px-5 py-3 text-base font-medium text-fg transition-colors hover:bg-bg-muted"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-sm text-fg-subtle">
            Free tier. No credit card. Self-hostable too.
          </p>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: Boxes,
    title: 'Apps & Sites',
    body: 'Deploy from Git, Dockerfile, image, or template. Auto-scaling, blue/green rollouts, instant rollback.',
  },
  {
    icon: Database,
    title: 'Managed Postgres',
    body: 'CloudNativePG under the hood. Backups, PITR, branch databases for previews.',
  },
  {
    icon: Cloud,
    title: 'S3-compatible storage',
    body: 'SeaweedFS-backed buckets with per-app credentials and lifecycle rules.',
  },
  {
    icon: Globe2,
    title: 'Multi-region',
    body: 'EU-Central first. Anycast edge, regional failover, pinned data residency.',
  },
  {
    icon: ShieldCheck,
    title: 'Real isolation',
    body: 'gVisor sandboxed runtimes, signed images (cosign), short-lived tokens by default.',
  },
  {
    icon: Zap,
    title: 'Predictable pricing',
    body: 'Hard caps, prepaid credits, no surprise egress bill. We metered ourselves first.',
  },
] as const;

function FeatureGrid() {
  return (
    <section className="border-b border-border/60 bg-bg-subtle/40 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            The platform doesn&apos;t fight you.
          </h2>
          <p className="mt-4 text-lg text-fg-muted">
            Every primitive you need, behind one well-versioned API.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border/70 bg-bg-elevated p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Read the contracts before you read the marketing.
        </h2>
        <p className="mt-4 text-lg text-fg-muted">
          Every endpoint is described by a Zod schema published in{' '}
          <code className="rounded bg-bg-muted px-1.5 py-0.5 font-mono text-sm">
            @absolo/contracts
          </code>
          . The same schemas validate requests on the server and generate the
          TypeScript SDK.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-md border border-border/80 bg-bg-elevated px-5 py-3 font-medium text-fg transition-colors hover:bg-bg-muted"
          >
            Read the docs
          </Link>
          <a
            href="https://github.com/absolo-cloud"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-5 py-3 font-medium text-white transition-colors hover:bg-brand-600"
          >
            Browse the source
          </a>
        </div>
      </div>
    </section>
  );
}
