import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Label,
  Skeleton,
  toast,
} from '@absolo/ui';
import { Database, HardDrive, Plus, Trash2, Zap } from '@absolo/icons';
import { api } from '@/lib/api';

interface BindingsPanelProps {
  appId: string;
  orgId: string;
}

/**
 * Reusable bindings panel — shows resources bound to an app
 * and provides bind/unbind actions.
 */
export function BindingsPanel({ appId, orgId }: BindingsPanelProps) {
  const [bindOpen, setBindOpen] = useState(false);
  const queryClient = useQueryClient();

  const bindingsQuery = useQuery({
    queryKey: ['bindings', appId],
    queryFn: () => api.bindings.list(appId),
  });

  const unbindMutation = useMutation({
    mutationFn: (bindingId: string) => api.bindings.unbind(appId, bindingId),
    onSuccess: () => {
      toast.success('Resource unbound');
      void queryClient.invalidateQueries({ queryKey: ['bindings', appId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bindingsList = bindingsQuery.data?.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-brand-500" />
            Bindings
          </CardTitle>
          <CardDescription>
            Bound databases and buckets. Env vars are auto-injected on deploy.
          </CardDescription>
        </div>
        <Dialog open={bindOpen} onOpenChange={setBindOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-1.5 h-3 w-3" />
              Bind
            </Button>
          </DialogTrigger>
          <BindResourceDialog
            appId={appId}
            orgId={orgId}
            onSuccess={() => {
              setBindOpen(false);
              void queryClient.invalidateQueries({ queryKey: ['bindings', appId] });
            }}
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        {bindingsQuery.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : bindingsList.length > 0 ? (
          <div className="space-y-2">
            {bindingsList.map((binding: any) => (
              <div
                key={binding.id}
                className="flex items-center justify-between rounded-md border border-border/50 px-4 py-3 transition-colors hover:bg-bg-subtle/30"
              >
                <div className="flex items-center gap-3">
                  {binding.resourceType === 'database' ? (
                    <Database className="h-4 w-4 text-blue-500" />
                  ) : (
                    <HardDrive className="h-4 w-4 text-brand-500" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-fg">
                        {binding.resource?.name ?? binding.resourceId}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {binding.resourceType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[10px] text-fg-subtle">
                        prefix: {binding.envPrefix}_*
                      </span>
                      {binding.autoInject && (
                        <span className="text-[10px] text-success-600">auto-inject</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={() => unbindMutation.mutate(binding.id)}
                  loading={unbindMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-fg-muted py-4 text-center">
            No resources bound. Bind a database or bucket to auto-inject connection env vars.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Bind dialog
// ---------------------------------------------------------------------------

function BindResourceDialog({
  appId,
  orgId,
  onSuccess,
}: {
  appId: string;
  orgId: string;
  onSuccess: () => void;
}) {
  const [resourceType, setResourceType] = useState<'database' | 'bucket'>('database');
  const [selectedId, setSelectedId] = useState('');

  const dbQuery = useQuery({
    queryKey: ['databases', orgId],
    queryFn: () => api.databases.list(orgId),
    enabled: resourceType === 'database',
  });

  const bucketsQuery = useQuery({
    queryKey: ['buckets', orgId],
    queryFn: () => api.storage.list(orgId),
    enabled: resourceType === 'bucket',
  });

  const bindMutation = useMutation({
    mutationFn: () => api.bindings.bind(appId, { resourceType, resourceId: selectedId }),
    onSuccess: () => {
      toast.success('Resource bound');
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resources =
    resourceType === 'database' ? (dbQuery.data?.data ?? []) : (bucketsQuery.data?.data ?? []);

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Bind Resource</DialogTitle>
        <DialogDescription>
          Select a database or bucket to bind. Connection env vars will be auto-injected.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Resource Type</Label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setResourceType('database');
                setSelectedId('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                resourceType === 'database'
                  ? 'border-brand-500 bg-brand-500/10 text-brand-600'
                  : 'border-border/60 text-fg-muted hover:border-border'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              Database
            </button>
            <button
              onClick={() => {
                setResourceType('bucket');
                setSelectedId('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                resourceType === 'bucket'
                  ? 'border-brand-500 bg-brand-500/10 text-brand-600'
                  : 'border-border/60 text-fg-muted hover:border-border'
              }`}
            >
              <HardDrive className="h-3.5 w-3.5" />
              Bucket
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Select Resource</Label>
          {resources.length === 0 ? (
            <p className="text-xs text-fg-muted py-3">
              No {resourceType === 'database' ? 'databases' : 'buckets'} available. Create one
              first.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {resources.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                    selectedId === r.id
                      ? 'border-brand-500 bg-brand-500/5'
                      : 'border-border/40 hover:border-border/70'
                  }`}
                >
                  <span className="font-medium text-fg">{r.name}</span>
                  {r.engine && (
                    <span className="ml-2 text-xs text-fg-subtle">
                      {r.engine} v{r.version}
                    </span>
                  )}
                  {r.slug && (
                    <span className="ml-2 font-mono text-xs text-fg-subtle">{r.slug}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => bindMutation.mutate()}
          loading={bindMutation.isPending}
          disabled={!selectedId}
        >
          Bind Resource
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
