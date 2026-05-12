import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { AppShell } from './components/app-shell';
import { SignInPage } from './pages/sign-in';
import { ProjectsListPage } from './pages/projects-list';
import { ProjectDetailPage } from './pages/project-detail';
import { BillingPage } from './pages/billing';
import { DatabasesPage } from './pages/databases';
import { StoragePage } from './pages/storage';
import { SettingsPage } from './pages/settings';
import { TeamPage } from './pages/team';
import { ApiKeysPage } from './pages/api-keys';
import { InfrastructurePage } from './pages/infrastructure';

interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to="/projects" replace />,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: SignInPage,
});

/** Authenticated layout — every route nested below sees the AppShell. */
const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: AppShell,
});

const projectsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/projects',
  component: ProjectsListPage,
});

const projectDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/projects/$projectId',
  component: ProjectDetailPage,
});

const billingRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/billing',
  component: BillingPage,
});

const databasesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/databases',
  component: DatabasesPage,
});

const storageRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/storage',
  component: StoragePage,
});

const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/settings',
  component: SettingsPage,
});

const teamRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/team',
  component: TeamPage,
});

const apiKeysRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/api-keys',
  component: ApiKeysPage,
});

const infrastructureRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/infrastructure',
  component: InfrastructurePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  appLayoutRoute.addChildren([
    projectsRoute,
    projectDetailRoute,
    billingRoute,
    databasesRoute,
    storageRoute,
    infrastructureRoute,
    settingsRoute,
    teamRoute,
    apiKeysRoute,
  ]),
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
