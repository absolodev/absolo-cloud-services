import type { Metadata } from 'next';
import { Check } from '@absolo/icons';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Free tier with no credit card. Hobby at $5/mo. Pro at $39/mo. Hard caps and prepaid credits — no surprise bills.',
};

type Tier = {
  name: string;
  price: string;
  period: string;
  blurb: string;
  cta: string;
  href: string;
  features: string[];
  highlight?: boolean;
};

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    blurb: 'Personal projects, learning, demos.',
    cta: 'Start free',
    href: 'https://app.absolo.cloud/sign-up?plan=free',
    features: [
      '1 project, 1 environment',
      '1 small app (256 MB)',
      '500 MB Postgres + 1 GB bucket',
      '100 GB egress / month',
      'Community support',
    ],
  },
  {
    name: 'Hobby',
    price: '$5',
    period: '/ month',
    blurb: 'Side projects with real users.',
    cta: 'Start Hobby',
    href: 'https://app.absolo.cloud/sign-up?plan=hobby',
    features: [
      '5 projects, 1 staging env',
      '2 GB Postgres + 10 GB bucket',
      '1 TB egress / month',
      'Custom domains + SSL',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    price: '$39',
    period: '/ month',
    blurb: 'Production apps with a team.',
    cta: 'Start Pro',
    href: 'https://app.absolo.cloud/sign-up?plan=pro',
    features: [
      'Unlimited projects',
      'Branch DBs for PR previews',
      'First staging env free',
      '5 TB egress / month',
      'Priority support, 99.9% SLA',
    ],
    highlight: true,
  },
  {
    name: 'Business',
    price: 'Custom',
    period: '',
    blurb: 'Compliance-bound teams.',
    cta: 'Contact sales',
    href: '/contact?topic=business',
    features: [
      'SOC 2 + DPA + SLA addenda',
      'SSO (SAML/OIDC), SCIM',
      'Dedicated nodes available',
      '3 staging envs free',
      'Named support engineer',
    ],
  },
];

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Pricing that does the math for you.
        </h1>
        <p className="mt-4 text-lg text-fg-muted">
          Hard caps by default. Prepaid credits if you want to be extra-paranoid.
          No surprise egress bills, ever.
        </p>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-4">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={[
              'flex flex-col rounded-xl border bg-bg-elevated p-6',
              tier.highlight
                ? 'border-brand-500/60 ring-2 ring-brand-500/20'
                : 'border-border/70',
            ].join(' ')}
          >
            {tier.highlight && (
              <span className="mb-3 inline-flex w-fit items-center rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-medium text-brand-600">
                Most popular
              </span>
            )}
            <h3 className="text-xl font-semibold tracking-tight">{tier.name}</h3>
            <p className="mt-1 text-sm text-fg-muted">{tier.blurb}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight">{tier.price}</span>
              <span className="text-sm text-fg-muted">{tier.period}</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-success-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a
              href={tier.href}
              className={[
                'mt-8 inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
                tier.highlight
                  ? 'bg-brand-500 text-white hover:bg-brand-600'
                  : 'border border-border/80 text-fg hover:bg-bg-muted',
              ].join(' ')}
            >
              {tier.cta}
            </a>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-xl border border-border/70 bg-bg-subtle/40 p-6 text-sm text-fg-muted">
        <p>
          Usage above your plan&apos;s included resources is metered and billed
          monthly via Stripe. Hard caps live in your dashboard — flip one switch
          to make sure you can never exceed a number you set. See the{' '}
          <a href="/docs/billing" className="text-fg underline-offset-4 hover:underline">
            billing docs
          </a>{' '}
          for the complete metering reference.
        </p>
      </div>
    </section>
  );
}
