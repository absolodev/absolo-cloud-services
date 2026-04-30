import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Boxes, Code2, KeyRound, Cloud } from '@absolo/icons';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Guides, references and recipes for shipping with Absolo Cloud.',
};

const SECTIONS = [
  {
    icon: Boxes,
    title: 'Get started',
    body: 'From zero to a deployed app in five minutes. CLI, dashboard, and template flows.',
    href: '/docs/get-started',
  },
  {
    icon: Code2,
    title: 'Apps & sites',
    body: 'Build specs, runtime configs, blue/green rollouts, traffic splits, instant rollback.',
    href: '/docs/apps',
  },
  {
    icon: Cloud,
    title: 'Managed services',
    body: 'Postgres, buckets, queues. Backups, branch DBs, lifecycle rules and bindings.',
    href: '/docs/managed',
  },
  {
    icon: KeyRound,
    title: 'API reference',
    body: 'Every endpoint, every schema, generated from @absolo/contracts. Stable v1.',
    href: '/docs/api',
  },
] as const;

export default function DocsLandingPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Documentation
        </h1>
        <p className="mt-4 text-lg text-fg-muted">
          The docs you wish every PaaS shipped: contracts first, examples second,
          marketing nowhere.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col rounded-xl border border-border/70 bg-bg-elevated p-6 transition-all hover:border-brand-500/60 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
              <s.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight">{s.title}</h2>
            <p className="mt-2 flex-1 text-sm text-fg-muted">{s.body}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
              Read
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-16 rounded-xl border border-border/70 bg-bg-subtle/40 p-6">
        <h3 className="text-base font-semibold tracking-tight">Looking for the SDK?</h3>
        <p className="mt-2 text-sm text-fg-muted">
          The TypeScript SDK ships in the same monorepo. Install with{' '}
          <code className="rounded bg-bg-muted px-1.5 py-0.5 font-mono text-xs">
            pnpm add @absolo/sdk
          </code>{' '}
          (once published). Until then, the source lives at{' '}
          <a
            href="https://github.com/absolo-cloud"
            className="text-fg underline-offset-4 hover:underline"
          >
            github.com/absolo-cloud
          </a>
          .
        </p>
      </div>
    </section>
  );
}
