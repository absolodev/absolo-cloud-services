import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { AbsoloMark } from '@absolo/icons/brand';
import {
  Boxes,
  CreditCard,
  KeyRound,
  Settings,
  Users,
  type LucideIcon,
} from '@absolo/icons';

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/projects', label: 'Projects', icon: Boxes },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/api-keys', label: 'API keys', icon: KeyRound },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Authenticated app shell: persistent sidebar + outlet for the active route.
 *
 * Routes that don't yet exist (Team, Billing, etc.) still render a sidebar
 * link so the shape is right; clicking them lands on a 404 until the
 * implementation arrives.
 */
export function AppShell() {
  const { location } = useRouterState();

  return (
    <div className="grid h-full grid-cols-[16rem_1fr]">
      <aside className="flex h-full flex-col border-r border-border/60 bg-bg-subtle/40">
        <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4">
          <AbsoloMark className="h-7 w-7 text-brand-500" />
          <span className="font-semibold tracking-tight">Absolo</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((item) => {
            const isActive =
              location.pathname === item.to ||
              location.pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-bg-elevated text-fg shadow-sm ring-1 ring-border/70'
                    : 'text-fg-muted hover:bg-bg-muted hover:text-fg',
                ].join(' ')}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border/60 p-3 text-xs text-fg-subtle">
          <span className="block">Phase 0 \u00b7 Free tier</span>
          <span className="block">Region: eu-central</span>
        </div>
      </aside>
      <main className="h-full overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
