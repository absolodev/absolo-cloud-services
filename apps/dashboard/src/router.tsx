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

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  appLayoutRoute.addChildren([projectsRoute, projectDetailRoute]),
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
