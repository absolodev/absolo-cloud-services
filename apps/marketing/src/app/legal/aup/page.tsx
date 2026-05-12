import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy | Absolo Cloud',
  description: 'Acceptable Use Policy for Absolo Cloud PaaS',
};

export default function AupPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Acceptable Use Policy</h1>
      <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
        <p>Last updated: October 1, 2026</p>
        <p>
          This Acceptable Use Policy defines the rules for using the Absolo Cloud platform.
          Violation of this policy may result in suspension or termination of your account.
        </p>
        <h2>1. Prohibited Activities</h2>
        <ul>
          <li>
            <strong>Cryptomining:</strong> Mining of cryptocurrencies is strictly prohibited and
            will result in immediate termination.
          </li>
          <li>
            <strong>Spam:</strong> Sending unsolicited mass email or participating in DDoS attacks.
          </li>
          <li>
            <strong>Illegal Content:</strong> Hosting content that violates laws or promotes illegal
            activities.
          </li>
        </ul>
        <h2>2. Enforcement</h2>
        <p>
          Absolo reserves the right, but does not assume the obligation, to investigate any
          violation of this Policy or misuse of the Services. Absolo may:
        </p>
        <ul>
          <li>Investigate violations of this Policy or misuse of the Services;</li>
          <li>
            Remove, disable access to, or modify any content or resource that violates this Policy;
          </li>
          <li>
            Report any activity that we suspect violates any law or regulation to appropriate law
            enforcement officials, regulators, or other appropriate third parties.
          </li>
        </ul>
      </div>
    </div>
  );
}
