import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--absolo-font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Absolo Cloud — Boring deploys, predictable bills',
    template: '%s · Absolo Cloud',
  },
  description:
    'Self-hostable PaaS with managed Postgres, S3-compatible storage, multi-region deploys, and pricing that does not bite. Push, deploy, sleep.',
  metadataBase: new URL('https://absolo.cloud'),
  openGraph: {
    type: 'website',
    siteName: 'Absolo Cloud',
    title: 'Absolo Cloud — Boring deploys, predictable bills',
    description:
      'Self-hostable PaaS with managed Postgres, S3-compatible storage, and pricing that does not bite.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-bg text-fg">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
