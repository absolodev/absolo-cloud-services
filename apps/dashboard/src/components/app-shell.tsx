import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { AbsoloMark } from '@absolo/icons/brand';
import { Boxes, CreditCard, KeyRound, Settings, Users, type LucideIcon } from '@absolo/icons';

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/projects', label: 'Projects', icon: Boxes },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/api-keys', label: 'API keys', icon: KeyRound },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell() {
  const { location } = useRouterState();

  return (
    <div className="grid h-full grid-cols-[16rem_1fr] bg-background text-foreground">
      <aside className="flex h-full flex-col border-r border-border bg-card">
        <div className="flex h-14 items-center gap-3 border-b border-border px-5">
          <AbsoloMark className="h-6 w-6 text-primary" />
          <span className="font-bold tracking-tight text-foreground">Absolo</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                ].join(' ')}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4 text-xs font-medium text-muted-foreground">
          <span className="block text-foreground">Absolo Cloud \u00b7 Phase 1</span>
          <span className="block mt-1">
            Region: <span className="text-primary">eu-central</span>
          </span>
        </div>
      </aside>

      <main className="h-full overflow-y-auto bg-background">
        <div className="h-14 border-b border-border flex items-center px-6 sticky top-0 bg-background z-10">
          {/* Topbar placeholder */}
          <h1 className="text-sm font-medium text-muted-foreground">/ Dashboard</h1>
        </div>
        <div className="p-6 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
