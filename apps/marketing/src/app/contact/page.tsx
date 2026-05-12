import type { Metadata } from 'next';
import { Mail, MessageSquare } from '@absolo/icons';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with the Absolo Cloud team for sales, support, or partnership enquiries.',
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Contact us</h1>
        <p className="mt-4 text-lg text-fg-muted">
          Questions about pricing, enterprise plans, or partnerships? We would love to hear from
          you.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-bg-elevated p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
            <Mail className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Email</h3>
          <p className="mt-2 text-sm text-fg-muted">For general enquiries, sales, and support.</p>
          <a
            href="mailto:hello@absolo.cloud"
            className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            hello@absolo.cloud →
          </a>
        </div>

        <div className="rounded-xl border border-border/70 bg-bg-elevated p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
            <MessageSquare className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Discord</h3>
          <p className="mt-2 text-sm text-fg-muted">
            Join our community for real-time help and product discussions.
          </p>
          <a
            href="https://discord.gg/absolo"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Join Discord →
          </a>
        </div>
      </div>

      <div className="mt-12 rounded-xl border border-border/70 bg-bg-subtle/40 p-8 text-center">
        <h2 className="text-xl font-semibold tracking-tight">Enterprise enquiries</h2>
        <p className="mt-3 text-fg-muted text-sm">
          Need SSO, SOC 2, custom SLAs, or dedicated infrastructure? Contact our sales team at{' '}
          <a
            href="mailto:sales@absolo.cloud"
            className="text-brand-600 underline-offset-4 hover:underline"
          >
            sales@absolo.cloud
          </a>
          .
        </p>
      </div>
    </section>
  );
}
