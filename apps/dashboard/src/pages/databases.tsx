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
  Input,
  Label,
  Skeleton,
  toast,
} from '@absolo/ui';
import {
  Database,
  HardDrive,
  Plus,
  Shield,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
} from '@absolo/icons';
import { api } from '@/lib/api';

const DEMO_ORG_ID = 'org_01HZX9DEMO0000000000000000';

const ENGINE_INFO: Record<string, { label: string; color: string; versions: string[] }> = {
  postgres: { label: 'PostgreSQL', color: 'text-blue-500', versions: ['17', '16', '15'] },
  mysql: { label: 'MySQL', color: 'text-orange-500', versions: ['8.4', '8.0'] },
  redis: { label: 'Redis', color: 'text-red-500', versions: ['7.4'] },
};

const SIZE_LABELS: Record<string, string> = {
  xs: 'XS (0.25 vCPU, 256 MB)',
  s: 'S (0.5 vCPU, 512 MB)',
  m: 'M (1 vCPU, 1 GB)',
  l: 'L (2 vCPU, 2 GB)',
  xl: 'XL (4 vCPU, 4 GB)',
  '2xl': '2XL (8 vCPU, 8 GB)',
  '4xl': '4XL (16 vCPU, 16 GB)',
};

export function DatabasesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const dbQuery = useQuery({
    queryKey: ['databases', DEMO_ORG_ID],
    queryFn: () => api.databases.list(DEMO_ORG_ID),
  });

  const databases = dbQuery.data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Databases</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Managed Postgres, MySQL, and Redis — hourly billed.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Database
            </Button>
          </DialogTrigger>
          <CreateDatabaseDialog
            onSuccess={() => {
              setCreateOpen(false);
              void queryClient.invalidateQueries({ queryKey: ['databases'] });
            }}
          />
        </Dialog>
      </header>

      {dbQuery.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : databases.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {databases.map((db: any) => (
            <DatabaseCard key={db.id} db={db} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="h-12 w-12 text-fg-subtle mb-4" />
            <p className="text-lg font-medium text-fg">No databases yet</p>
            <p className="mt-1 text-sm text-fg-muted">
              Create your first managed database to get started.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Database
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Database card
// ---------------------------------------------------------------------------

function DatabaseCard({ db }: { db: any }) {
  const [showPassword, setShowPassword] = useState(false);
  const engineInfo = ENGINE_INFO[db.engine] ?? { label: db.engine, color: 'text-fg', versions: [] };

  const statusColor = (s: string) => {
    switch (s) {
      case 'ready':
        return 'success';
      case 'provisioning':
      case 'scaling':
      case 'backing_up':
        return 'warning';
      case 'failed':
      case 'deleting':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className={`h-4 w-4 ${engineInfo.color}`} />
            {db.name}
          </CardTitle>
          <Badge variant={statusColor(db.status) as any} className="text-[10px]">
            {db.status}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          <span className="font-semibold">{engineInfo.label}</span>
          <span className="text-fg-subtle">v{db.version}</span>
          <span className="text-fg-subtle">·</span>
          <span>{SIZE_LABELS[db.size]?.split(' ')[0] ?? db.size}</span>
          {db.ha && (
            <>
              <span className="text-fg-subtle">·</span>
              <span className="flex items-center gap-1 text-success-600">
                <Shield className="h-3 w-3" /> HA
              </span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-y-2 text-xs">
          <dt className="text-fg-subtle">Region</dt>
          <dd className="font-mono text-fg">{db.region}</dd>
          <dt className="text-fg-subtle">Storage</dt>
          <dd className="font-mono text-fg">{db.storageGb} GB</dd>
          {db.endpointHost && (
            <>
              <dt className="text-fg-subtle">Host</dt>
              <dd className="font-mono text-fg truncate">{db.endpointHost}</dd>
            </>
          )}
          {db.endpointPort && (
            <>
              <dt className="text-fg-subtle">Port</dt>
              <dd className="font-mono text-fg">{db.endpointPort}</dd>
            </>
          )}
        </dl>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-border/50 px-3 py-2">
          <span className="text-[10px] text-fg-subtle">user</span>
          <span className="font-mono text-xs text-fg">{db.masterUsername}</span>
          <span className="ml-auto text-[10px] text-fg-subtle">
            {new Date(db.createdAt).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Create dialog
// ---------------------------------------------------------------------------

function CreateDatabaseDialog({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [engine, setEngine] = useState<string>('postgres');
  const [version, setVersion] = useState('17');
  const [size, setSize] = useState('s');
  const [ha, setHa] = useState(false);
  const [storageGb, setStorageGb] = useState(1);
  const [region, setRegion] = useState('eu-fra');

  const regionsQuery = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.platform.listRegions(),
  });
  const regions = regionsQuery.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      api.databases.create('proj_demo', {
        orgId: DEMO_ORG_ID,
        name,
        engine: engine as any,
        version,
        size: size as any,
        ha,
        region,
        storageGb,
      }),
    onSuccess: () => {
      toast.success('Database created');
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const versions = ENGINE_INFO[engine]?.versions ?? [];

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Create Managed Database</DialogTitle>
        <DialogDescription>
          Pick an engine, size, and region. You'll get connection details once it's ready.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input placeholder="my-app-db" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Engine</Label>
          <div className="flex gap-2">
            {Object.entries(ENGINE_INFO).map(([key, info]) => (
              <button
                key={key}
                onClick={() => {
                  setEngine(key);
                  setVersion(info.versions[0] ?? '');
                }}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  engine === key
                    ? 'border-brand-500 bg-brand-500/10 text-brand-600'
                    : 'border-border/60 text-fg-muted hover:border-border'
                }`}
              >
                {info.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Region</Label>
          <select
            className="w-full rounded-md border border-border/60 bg-bg px-3 py-2 text-sm"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            {regions.map((r: any) => (
              <option key={r.code} value={r.code}>
                {r.name} ({r.code})
              </option>
            ))}
            {regions.length === 0 && <option value="eu-fra">Europe (Frankfurt)</option>}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Version</Label>
            <select
              className="w-full rounded-md border border-border/60 bg-bg px-3 py-2 text-sm"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            >
              {versions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Size</Label>
            <select
              className="w-full rounded-md border border-border/60 bg-bg px-3 py-2 text-sm"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            >
              {Object.entries(SIZE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Storage (GB)</Label>
            <Input
              type="number"
              min={1}
              max={2048}
              value={storageGb}
              onChange={(e) => setStorageGb(parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={ha}
                onChange={(e) => setHa(e.target.checked)}
                className="rounded border-border"
              />
              <Shield className="h-3.5 w-3.5 text-success-500" />
              High Availability
            </label>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
          Create Database
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
