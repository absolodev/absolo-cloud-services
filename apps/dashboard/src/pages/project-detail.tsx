import { useParams, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@absolo/ui';
import { ArrowLeft } from '@absolo/icons';
import { api } from '@/lib/api';
import { ConfigEditor } from '@/components/config-editor';

/**
 * Project detail page. Tabbed: overview / config / environments / settings.
 *
 * Phase 0 implements:
 * - Overview: project metadata.
 * - Config: env-vars editor against the first environment.
 *
 * The remaining tabs are placeholders until their domain modules ship.
 */
export function ProjectDetailPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.projects.get(projectId),
  });

  const envsQuery = useQuery({
    queryKey: ['environments', projectId],
    queryFn: () => api.environments.list(projectId),
    enabled: !!projectQuery.data,
  });

  if (projectQuery.isPending) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-8 py-10">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (projectQuery.isError) {
    return (
      <div className="mx-auto max-w-6xl px-8 py-10">
        <p className="text-danger-600">{projectQuery.error.message}</p>
      </div>
    );
  }

  const project = projectQuery.data;
  const envs = envsQuery.data?.data ?? [];
  const primaryEnv = envs[0];

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        All projects
      </Link>
      <header className="mt-4 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-1 font-mono text-xs text-fg-muted">{project.slug}</p>
          {project.description ? (
            <p className="mt-2 max-w-2xl text-sm text-fg-muted">
              {project.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>
            {project.status}
          </Badge>
          <Badge variant="outline">{project.region}</Badge>
        </div>
      </header>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="environments">Environments</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <MetadataCard project={project} envCount={envs.length} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick actions</CardTitle>
                <CardDescription>
                  Deploy from Git or a Dockerfile, or attach a managed service.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-fg-muted">
                <p>
                  Phase-0 placeholder. The deploy + bindings flows ship with the
                  apps + bindings modules.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          {envsQuery.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : primaryEnv ? (
            <ConfigEditor projectId={project.id} environmentId={primaryEnv.id} />
          ) : (
            <p className="text-sm text-fg-muted">
              No environments yet \u2014 create one before editing configuration.
            </p>
          )}
        </TabsContent>

        <TabsContent value="environments" className="mt-6">
          <p className="text-sm text-fg-muted">
            {envs.length === 0
              ? 'No environments yet.'
              : `${envs.length} environment(s) attached.`}
          </p>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <p className="text-sm text-fg-muted">
            Settings UI lands once the IAM + audit modules ship.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetadataCard({
  project,
  envCount,
}: {
  project: { id: string; createdAt: string; kind: string };
  envCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Metadata</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-fg-subtle">ID</dt>
          <dd className="font-mono text-xs text-fg">{project.id}</dd>
          <dt className="text-fg-subtle">Kind</dt>
          <dd className="text-fg">{project.kind}</dd>
          <dt className="text-fg-subtle">Environments</dt>
          <dd className="text-fg">{envCount}</dd>
          <dt className="text-fg-subtle">Created</dt>
          <dd className="text-fg">
            {new Date(project.createdAt).toLocaleDateString()}
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}
