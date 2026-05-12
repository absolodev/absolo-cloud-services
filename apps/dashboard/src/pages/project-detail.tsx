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
import { ArrowLeft, Rocket, GitBranch } from '@absolo/icons';
import { api } from '@/lib/api';
import { ConfigEditor } from '@/components/config-editor';
import { VolumesUI } from '@/components/volumes-ui';

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
            <p className="mt-2 max-w-2xl text-sm text-fg-muted">{project.description}</p>
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
          <TabsTrigger value="volumes">Volumes</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <MetadataCard project={project} envCount={envs.length} />
            <DeploymentsCard projectId={project.id} primaryEnv={primaryEnv} />
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
            {envs.length === 0 ? 'No environments yet.' : `${envs.length} environment(s) attached.`}
          </p>
        </TabsContent>

        <TabsContent value="volumes" className="mt-6">
          {envsQuery.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : primaryEnv ? (
            <VolumesUI projectId={project.id} environmentId={primaryEnv.id} />
          ) : (
            <p className="text-sm text-fg-muted">
              No environments yet \u2014 create one to manage volumes.
            </p>
          )}
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
          <dd className="text-fg">{new Date(project.createdAt).toLocaleDateString()}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}

function DeploymentsCard({
  projectId,
  primaryEnv,
}: {
  projectId: string;
  primaryEnv?: { id: string } | undefined;
}) {
  const appsQuery = useQuery({
    queryKey: ['apps', primaryEnv?.id],
    queryFn: () => api.apps.list(primaryEnv!.id),
    enabled: !!primaryEnv,
  });

  const apps = appsQuery.data?.data ?? [];

  // Demo deployment data — replaced with real data once deployment API wired
  const recentDeployments = [
    {
      id: 'dep_demo_001',
      status: 'live',
      versionId: 'v3',
      sourceCommitSha: 'a1b2c3d',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      trafficPct: 100,
    },
    {
      id: 'dep_demo_002',
      status: 'superseded',
      versionId: 'v2',
      sourceCommitSha: 'e4f5g6h',
      createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      trafficPct: 0,
    },
    {
      id: 'dep_demo_003',
      status: 'superseded',
      versionId: 'v1',
      sourceCommitSha: 'i7j8k9l',
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      trafficPct: 0,
    },
  ];

  const statusColor = (s: string) => {
    switch (s) {
      case 'live':
        return 'success';
      case 'building':
      case 'deploying':
      case 'queued':
        return 'warning';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className="h-4 w-4 text-brand-500" />
            Recent Deployments
          </CardTitle>
          <CardDescription>{apps.length} app(s) in this environment.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentDeployments.map((dep) => (
            <div
              key={dep.id}
              className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2.5 transition-colors hover:bg-bg-subtle/30"
            >
              <div className="flex items-center gap-3">
                <Badge variant={statusColor(dep.status) as any} className="text-[10px]">
                  {dep.status}
                </Badge>
                <span className="text-sm font-medium text-fg">{dep.versionId}</span>
                {dep.sourceCommitSha && (
                  <span className="flex items-center gap-1 font-mono text-[11px] text-fg-subtle">
                    <GitBranch className="h-3 w-3" />
                    {dep.sourceCommitSha.slice(0, 7)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {dep.trafficPct > 0 && (
                  <span className="rounded bg-success-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-success-600">
                    {dep.trafficPct}% traffic
                  </span>
                )}
                <span className="text-[11px] text-fg-subtle">
                  {new Date(dep.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
