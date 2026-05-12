import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Processing Agreement | Absolo Cloud',
  description: 'Data Processing Agreement for Absolo Cloud PaaS',
};

export default function DpaPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Data Processing Agreement</h1>
      <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
        <p>Last updated: October 1, 2026</p>
        <p>
          This Data Processing Agreement ("DPA") supplements the Terms of Service. It reflects the
          parties' agreement with respect to the terms governing the processing of Personal Data
          under the Agreement.
        </p>
        <h2>1. Definitions</h2>
        <p>
          "Personal Data" means any information relating to an identified or identifiable natural
          person.
        </p>
        <h2>2. Processing of Personal Data</h2>
        <p>
          Absolo will only process Personal Data on documented instructions from the customer.
          Absolo ensures that persons authorized to process the Personal Data have committed
          themselves to confidentiality.
        </p>
        <h2>3. Security Measures</h2>
        <p>
          Absolo will implement appropriate technical and organizational measures to ensure a level
          of security appropriate to the risk, including inter alia as appropriate:
        </p>
        <ul>
          <li>The pseudonymization and encryption of personal data;</li>
          <li>
            The ability to ensure the ongoing confidentiality, integrity, availability and
            resilience of processing systems and services;
          </li>
          <li>
            The ability to restore the availability and access to personal data in a timely manner
            in the event of a physical or technical incident.
          </li>
        </ul>
      </div>
    </div>
  );
}
