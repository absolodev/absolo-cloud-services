import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { AbsoloMark } from '@absolo/icons/brand';
import {
  Activity,
  AlertTriangle,
  Building2,
  FileText,
  Server,
  Users,
  DollarSign,
  Shield,
  type LucideIcon,
} from '@absolo/icons';

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Overview', icon: Activity },
  { to: '/fleet', label: 'Fleet', icon: Server },
  { to: '/enterprise', label: 'Enterprise', icon: Building2 },
  { to: '/orgs', label: 'Organisations', icon: Users },
  { to: '/abuse', label: 'Abuse', icon: Shield },
  { to: '/finance', label: 'Finance', icon: DollarSign },
  { to: '/audit', label: 'Audit log', icon: FileText },
];

/**
 * Admin shell. Visually distinct from the customer dashboard — narrower
 * sidebar, monospace nav, prominent "INTERNAL" tag so staff never confuse it
 * with the customer-facing app.
 */
export function AdminShell() {
  const { location } = useRouterState();

  return (
    <div className="grid h-full grid-cols-[15rem_1fr] bg-background text-foreground">
      <aside className="flex h-full flex-col border-r border-border bg-card">
        <div className="flex h-14 w-full items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <AbsoloMark className="h-5 w-5 text-destructive" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-destructive">
              Internal
            </span>
          </div>
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-destructive">
            staff
          </span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const isActive =
              item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 font-mono text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-destructive text-destructive-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                ].join(' ')}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label.toLowerCase()}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-[11px] leading-snug text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
            <span>Every action here is audited.</span>
          </div>
        </div>
      </aside>

      <main className="h-full overflow-y-auto bg-background">
        <div className="h-14 border-b border-border flex items-center px-6 sticky top-0 bg-background z-10">
          <h1 className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-widest">
            / Admin
          </h1>
        </div>
        <div className="p-6 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
