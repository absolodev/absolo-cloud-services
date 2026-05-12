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
import { Settings, Trash2, Globe2 } from '@absolo/icons';
import { api } from '@/lib/api';

const DEMO_ORG_ID = 'org_01HZX9DEMO0000000000000000';

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5 text-fg-subtle" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Organisation settings, default region, and danger zone.
        </p>
      </header>

      <div className="space-y-6">
        <OrgInfoCard orgId={DEMO_ORG_ID} />
        <DefaultRegionCard orgId={DEMO_ORG_ID} />
        <DangerZoneCard orgId={DEMO_ORG_ID} />
      </div>
    </div>
  );
}

function OrgInfoCard({ orgId }: { orgId: string }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organisation</CardTitle>
        <CardDescription>Your organisation name and slug.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-fg-subtle">Org ID</dt>
          <dd className="font-mono text-xs text-fg">{orgId}</dd>
          <dt className="text-fg-subtle">Name</dt>
          <dd className="text-fg">
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 w-48"
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    toast.success('Name updated');
                    setEditing(false);
                  }}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>My Organisation</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setName('My Organisation');
                    setEditing(true);
                  }}
                >
                  Edit
                </Button>
              </div>
            )}
          </dd>
          <dt className="text-fg-subtle">Slug</dt>
          <dd className="font-mono text-xs text-fg">my-org</dd>
          <dt className="text-fg-subtle">Plan</dt>
          <dd>
            <Badge variant="success">Pro</Badge>
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}

function DefaultRegionCard({ orgId }: { orgId: string }) {
  const [region, setRegion] = useState('eu-fra');

  const regionsQuery = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.platform.listRegions(),
  });
  const regions = regionsQuery.data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-brand-500" />
          Default Region
        </CardTitle>
        <CardDescription>
          New projects will use this region unless overridden at creation time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <select
          className="w-full max-w-xs rounded-md border border-border/60 bg-bg px-3 py-2 text-sm"
          value={region}
          onChange={(e) => {
            setRegion(e.target.value);
            toast.success(`Default region set to ${e.target.value}`);
          }}
        >
          {regions.map((r: any) => (
            <option key={r.code} value={r.code}>
              {r.name} ({r.code})
            </option>
          ))}
          {regions.length === 0 && <option value="eu-fra">Europe (Frankfurt)</option>}
        </select>
      </CardContent>
    </Card>
  );
}

function DangerZoneCard({ orgId }: { orgId: string }) {
  const [confirmDelete, setConfirmDelete] = useState('');

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive flex items-center gap-2">
          <Trash2 className="h-4 w-4" />
          Danger Zone
        </CardTitle>
        <CardDescription>Irreversible and destructive actions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <h4 className="text-sm font-medium text-destructive">Delete organisation</h4>
          <p className="mt-1 text-xs text-fg-muted">
            This will permanently delete your organisation and all associated resources (projects,
            apps, databases, buckets). This action cannot be undone.
          </p>
          <div className="mt-3 flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-fg-subtle">Type your org slug to confirm</Label>
              <Input
                placeholder="my-org"
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                className="h-8 w-48"
              />
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="h-8"
              disabled={confirmDelete !== 'my-org'}
              onClick={() => toast.error('Organisation deletion is not yet implemented')}
            >
              Delete permanently
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
