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
import { HardDrive, Plus, Copy, Eye, EyeOff, Globe, Trash2, Lock, Unlock } from '@absolo/icons';
import { api } from '@/lib/api';

const DEMO_ORG_ID = 'org_01HZX9DEMO0000000000000000';

export function StoragePage() {
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const bucketsQuery = useQuery({
    queryKey: ['buckets', DEMO_ORG_ID],
    queryFn: () => api.storage.list(DEMO_ORG_ID),
  });

  const bucketsList = bucketsQuery.data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Storage</h1>
          <p className="mt-1 text-sm text-fg-muted">
            S3-compatible object storage — create buckets, manage access keys.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Bucket
            </Button>
          </DialogTrigger>
          <CreateBucketDialog
            onSuccess={() => {
              setCreateOpen(false);
              void queryClient.invalidateQueries({ queryKey: ['buckets'] });
            }}
          />
        </Dialog>
      </header>

      {bucketsQuery.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      ) : bucketsList.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bucketsList.map((bucket: any) => (
            <BucketCard key={bucket.id} bucket={bucket} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <HardDrive className="h-12 w-12 text-fg-subtle mb-4" />
            <p className="text-lg font-medium text-fg">No buckets yet</p>
            <p className="mt-1 text-sm text-fg-muted">
              Create your first S3-compatible bucket to store files.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Bucket
            </Button>
          </CardContent>
        </Card>
      )}

      {/* S3 endpoint info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">S3 Configuration</CardTitle>
          <CardDescription>
            Use these values with any S3-compatible SDK (aws-sdk, boto3, minio-go).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-md border border-border/50 px-4 py-3">
              <div>
                <span className="text-xs text-fg-subtle uppercase tracking-wider">Endpoint</span>
                <p className="font-mono text-sm text-fg mt-0.5">https://s3.eu-central.absolo.app</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText('https://s3.eu-central.absolo.app');
                  toast.success('Copied');
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/50 px-4 py-3">
              <div>
                <span className="text-xs text-fg-subtle uppercase tracking-wider">Region</span>
                <p className="font-mono text-sm text-fg mt-0.5">eu-central</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText('eu-central');
                  toast.success('Copied');
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bucket card
// ---------------------------------------------------------------------------

function BucketCard({ bucket }: { bucket: any }) {
  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4 text-brand-500" />
            {bucket.name}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {bucket.publicRead ? (
              <Badge variant="warning" className="text-[10px]">
                <Globe className="mr-1 h-2.5 w-2.5" />
                Public
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                <Lock className="mr-1 h-2.5 w-2.5" />
                Private
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="font-mono text-xs">{bucket.slug}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-y-2 text-xs">
          <dt className="text-fg-subtle">Region</dt>
          <dd className="font-mono text-fg">{bucket.region}</dd>
          <dt className="text-fg-subtle">Versioning</dt>
          <dd className="text-fg">{bucket.versioning ? 'Enabled' : 'Off'}</dd>
          <dt className="text-fg-subtle">Created</dt>
          <dd className="font-mono text-fg">{new Date(bucket.createdAt).toLocaleDateString()}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Create dialog
// ---------------------------------------------------------------------------

function CreateBucketDialog({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [publicRead, setPublicRead] = useState(false);
  const [versioning, setVersioning] = useState(false);
  const [region, setRegion] = useState('eu-fra');

  const regionsQuery = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.platform.listRegions(),
  });
  const regions = regionsQuery.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      api.storage.create('proj_demo', {
        orgId: DEMO_ORG_ID,
        name,
        slug,
        region,
        publicRead,
        versioning,
      }),
    onSuccess: () => {
      toast.success('Bucket created');
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Create Bucket</DialogTitle>
        <DialogDescription>
          S3-compatible object storage. You'll receive access keys after creation.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Display Name</Label>
          <Input
            placeholder="Media uploads"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '-')
                  .replace(/-+/g, '-'),
              );
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Slug (S3 bucket name)</Label>
          <Input
            placeholder="media-uploads"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <p className="text-[10px] text-fg-subtle">
            Full bucket name: <span className="font-mono">your-org-{slug}</span>
          </p>
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

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={publicRead}
              onChange={(e) => setPublicRead(e.target.checked)}
              className="rounded border-border"
            />
            <Globe className="h-3.5 w-3.5 text-fg-subtle" />
            Public read
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={versioning}
              onChange={(e) => setVersioning(e.target.checked)}
              className="rounded border-border"
            />
            Object versioning
          </label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
          Create Bucket
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
