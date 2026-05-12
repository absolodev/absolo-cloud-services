import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Absolo Cloud',
  description: 'Terms of Service for Absolo Cloud PaaS',
};

export default function TosPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Terms of Service</h1>
      <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
        <p>Last updated: October 1, 2026</p>
        <h2>1. Agreement to Terms</h2>
        <p>
          By accessing or using Absolo Cloud services, you agree to be bound by these Terms of
          Service. If you disagree with any part of the terms, then you may not access the Service.
        </p>
        <h2>2. Use License</h2>
        <p>
          Permission is granted to temporarily download one copy of the materials (information or
          software) on Absolo's website for personal, non-commercial transitory viewing only.
        </p>
        <h2>3. Disclaimer</h2>
        <p>
          The materials on Absolo's website are provided on an 'as is' basis. Absolo makes no
          warranties, expressed or implied, and hereby disclaims and negates all other warranties
          including, without limitation, implied warranties or conditions of merchantability,
          fitness for a particular purpose, or non-infringement of intellectual property or other
          violation of rights.
        </p>
        <h2>4. Limitations</h2>
        <p>
          In no event shall Absolo or its suppliers be liable for any damages (including, without
          limitation, damages for loss of data or profit, or due to business interruption) arising
          out of the use or inability to use the materials on Absolo's website.
        </p>
      </div>
    </div>
  );
}
