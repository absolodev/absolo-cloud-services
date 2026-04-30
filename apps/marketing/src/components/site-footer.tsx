import Link from 'next/link';
import { AbsoloMark } from '@absolo/icons/brand';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/pricing', label: 'Pricing' },
      { href: '/docs', label: 'Docs' },
      { href: '/changelog', label: 'Changelog' },
      { href: '/status', label: 'Status' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/blog', label: 'Blog' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/legal/terms', label: 'Terms' },
      { href: '/legal/privacy', label: 'Privacy' },
      { href: '/legal/dpa', label: 'DPA' },
      { href: '/legal/sla', label: 'SLA' },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-bg-subtle">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AbsoloMark className="h-7 w-7 text-brand-500" />
            <span className="font-semibold tracking-tight">Absolo Cloud</span>
          </div>
          <p className="max-w-xs text-sm text-fg-muted">
            A modern PaaS without the lock-in tax. EU-first, open contracts,
            self-hostable.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-fg-subtle">
              {col.title}
            </h4>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-fg-muted transition-colors hover:text-fg"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-xs text-fg-subtle">
          <span>&copy; {new Date().getFullYear()} Absolo Cloud. All rights reserved.</span>
          <span>Made with care in the EU.</span>
        </div>
      </div>
    </footer>
  );
}
