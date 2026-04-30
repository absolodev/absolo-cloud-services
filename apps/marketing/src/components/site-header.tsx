import Link from 'next/link';
import { AbsoloWordmark } from '@absolo/icons/brand';
import { ArrowRight, Github } from '@absolo/icons';

const NAV = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
  { href: 'https://github.com/absolo-cloud', label: 'GitHub', external: true },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <AbsoloWordmark className="h-7 w-auto text-primary" />
          <span className="sr-only">Absolo Cloud</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) =>
            'external' in item ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="h-4 w-4" />
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href="https://app.absolo.cloud/sign-in"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
          >
            Sign in
          </a>
          <a
            href="https://app.absolo.cloud/sign-up"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Start free
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
