import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { AbsoloMark } from '@absolo/icons/brand';
import {
  Activity,
  AlertTriangle,
  FileText,
  Server,
  Users,
  type LucideIcon,
} from '@absolo/icons';

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Overview', icon: Activity },
  { to: '/fleet', label: 'Fleet', icon: Server },
  { to: '/orgs', label: 'Organisations', icon: Users },
  { to: '/audit', label: 'Audit log', icon: FileText },
];

/**
 * Admin shell. Visually distinct from the customer dashboard \u2014 narrower
 * sidebar, monospace nav, prominent "INTERNAL" tag so staff never confuse it
 * with the customer-facing app.
 */
export function AdminShell() {
  const { location } = useRouterState();

  return (
    <div className="grid h-full grid-cols-[15rem_1fr]">
      <aside className="flex h-full flex-col border-r border-border/60 bg-bg-subtle">
        <div className="flex h-14 items-center justify-between border-b border-border/60 px-4">
          <div className="flex items-center gap-2">
            <AbsoloMark className="h-6 w-6 text-warning-500" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-warning-600">
              Internal
            </span>
          </div>
          <span className="rounded bg-warning-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-warning-700">
            staff
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((item) => {
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 font-mono text-xs transition-colors',
                  isActive
                    ? 'bg-bg-elevated text-fg shadow-sm ring-1 ring-border/70'
                    : 'text-fg-muted hover:bg-bg-muted hover:text-fg',
                ].join(' ')}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label.toLowerCase()}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border/60 p-3">
          <div className="flex items-start gap-2 rounded-md border border-warning-500/30 bg-warning-500/5 p-2 text-[11px] leading-snug text-warning-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
            <span>Every action here is audited.</span>
          </div>
        </div>
      </aside>
      <main className="h-full overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
