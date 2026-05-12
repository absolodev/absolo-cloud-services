import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Absolo Cloud',
  description: 'Privacy Policy for Absolo Cloud PaaS',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Privacy Policy</h1>
      <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
        <p>Last updated: October 1, 2026</p>
        <h2>1. Information we collect</h2>
        <p>
          We only collect information about you if we have a reason to do so — for example, to
          provide our Services, to communicate with you, or to make our Services better.
        </p>
        <h2>2. How we use information</h2>
        <p>
          We use the information we collect to provide our Services to you, to communicate with you,
          and to improve our Services.
        </p>
        <h2>3. Sharing information</h2>
        <p>
          We do not sell your private personal information. We share information about you in
          limited circumstances, and with appropriate safeguards on your privacy.
        </p>
      </div>
    </div>
  );
}
