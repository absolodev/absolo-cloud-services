import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { queryClient } from './lib/api';
import { AdminShell } from './components/admin-shell';
import { OverviewPage } from './pages/overview';
import { FleetPage } from './pages/fleet';
import { OrgsPage } from './pages/orgs';
import { AuditPage } from './pages/audit';

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => <Outlet />,
});

const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  component: AdminShell,
});

const overviewRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  component: OverviewPage,
});

const fleetRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/fleet',
  component: FleetPage,
});

const orgsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/orgs',
  component: OrgsPage,
});

const auditRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/audit',
  component: AuditPage,
});

const routeTree = rootRoute.addChildren([
  shellRoute.addChildren([overviewRoute, fleetRoute, orgsRoute, auditRoute]),
]);

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
