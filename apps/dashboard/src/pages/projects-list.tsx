import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Skeleton,
  toast,
} from '@absolo/ui';
import { Plus, Boxes, ArrowRight } from '@absolo/icons';
import {
  CreateProjectRequestSchema,
  type CreateProjectRequest,
  type Project,
  type ProjectKind,
} from '@absolo/contracts/projects';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';

/**
 * Phase 0: orgId is hard-coded so we have something to fetch. Once the IAM
 * module ships, the active org comes from `auth.me()` plus an org-switcher in
 * the sidebar.
 */
const DEMO_ORG_ID = 'org_01HZX9DEMO0000000000000000';

const projectsKey = (orgId: string) => ['projects', orgId] as const;

export function ProjectsListPage() {
  const orgId = DEMO_ORG_ID;
  const projectsQuery = useQuery({
    queryKey: projectsKey(orgId),
    queryFn: () => api.projects.list(orgId),
  });

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Every app, site and managed service is grouped under a project.
          </p>
        </div>
        <CreateProjectDialog orgId={orgId} />
      </div>

      <div className="mt-8">
        {projectsQuery.isPending ? <ListSkeleton /> : null}
        {projectsQuery.isError ? (
          <ErrorState message={projectsQuery.error.message} />
        ) : null}
        {projectsQuery.data ? (
          projectsQuery.data.data.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projectsQuery.data.data.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="group block"
    >
      <Card className="h-full transition-shadow group-hover:shadow-md group-hover:border-brand-500/40">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">{project.name}</CardTitle>
            <CardDescription className="font-mono text-xs">
              {project.slug}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>
              {project.status}
            </Badge>
            <Badge variant="outline">{project.kind}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-sm text-fg-muted">
            {project.description || 'No description.'}
          </p>
          <div className="mt-4 flex items-center justify-between text-xs text-fg-subtle">
            <span>{project.region}</span>
            <span className="inline-flex items-center gap-1 text-brand-600 transition-transform group-hover:translate-x-0.5">
              Open
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-36 w-full rounded-xl" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border/80 py-16 text-center">
      <Boxes className="h-10 w-10 text-fg-subtle" />
      <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">
        Create your first project to start deploying apps and sites.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-danger-500/30 bg-danger-500/5 p-6 text-sm text-danger-700">
      <strong>Could not load projects.</strong>
      <p className="mt-1 text-danger-600">{message}</p>
    </div>
  );
}

/**
 * Modal-based create form. Validates with the canonical Zod schema so the
 * dashboard refuses requests the server would also reject.
 */
function CreateProjectDialog({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CreateProjectRequest>({
    resolver: zodResolver(CreateProjectRequestSchema),
    defaultValues: {
      slug: '',
      name: '',
      description: '',
      kind: 'app' as ProjectKind,
    },
  });

  const createMutation = useMutation({
    mutationFn: (req: CreateProjectRequest) => api.projects.create(orgId, req),
    onSuccess: (project) => {
      toast.success(`Project ${project.name} created`);
      void queryClient.invalidateQueries({ queryKey: projectsKey(orgId) });
      form.reset();
      setOpen(false);
    },
    onError: (err: Error) => {
      toast.error('Could not create project', { description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Slug is permanent. Pick something short that reads well in URLs.
          </DialogDescription>
        </DialogHeader>
        <form
          id="create-project-form"
          onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My App"
              {...form.register('name')}
              aria-invalid={!!form.formState.errors.name}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              placeholder="my-app"
              {...form.register('slug')}
              aria-invalid={!!form.formState.errors.slug}
            />
            {form.formState.errors.slug && (
              <p className="text-xs text-danger-600">
                {form.formState.errors.slug.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" {...form.register('description')} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-project-form"
            loading={createMutation.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
