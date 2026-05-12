import type { Metadata } from 'next';
import { Globe2, ShieldCheck, Users } from '@absolo/icons';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Absolo Cloud is a modern PaaS built for developers who want predictable infrastructure without the lock-in tax.',
};

const VALUES = [
  {
    icon: Globe2,
    title: 'Open by default',
    body: 'Open contracts, open source SDK, no proprietary lock-in. If you want to leave, your data and configs come with you.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy-first',
    body: 'EU-headquartered. Data stays in the region you pick. GDPR-compliant from day one, not as an afterthought.',
  },
  {
    icon: Users,
    title: 'Small team, big leverage',
    body: 'We are a small, senior team. Every feature ships with contracts, tests, and documentation — no "move fast and break things."',
  },
] as const;

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">About Absolo</h1>
        <p className="mt-6 text-lg leading-relaxed text-fg-muted">
          Absolo Cloud is a modern PaaS for teams that want to deploy apps, manage databases, and
          store objects — without surprise bills, vendor lock-in, or compliance headaches.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-fg-muted">
          We started Absolo because we got tired of explaining Heroku invoices to CFOs and debugging
          Vercel edge caches at 2 AM. The platform you use should be boring — boring is reliable,
          predictable, and trustworthy.
        </p>
      </div>

      <div className="mt-16 grid gap-8 md:grid-cols-3">
        {VALUES.map((v) => (
          <div key={v.title} className="rounded-xl border border-border/70 bg-bg-elevated p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
              <v.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-tight">{v.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{v.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-xl border border-border/70 bg-bg-subtle/40 p-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Want to join us?</h2>
        <p className="mt-3 text-fg-muted">
          We are always looking for senior engineers who care about infrastructure quality. Reach
          out at{' '}
          <a
            href="mailto:careers@absolo.cloud"
            className="text-brand-600 underline-offset-4 hover:underline"
          >
            careers@absolo.cloud
          </a>
          .
        </p>
      </div>
    </section>
  );
}
