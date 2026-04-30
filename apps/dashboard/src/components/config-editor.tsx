import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@absolo/ui';
import { Eye, EyeOff, Plus, Trash2 } from '@absolo/icons';
import {
  ConfigEntryInputSchema,
  type ConfigEntry,
  type PatchConfigRequest,
} from '@absolo/contracts/config';
import { api } from '@/lib/api';

/**
 * Config (env-var) editor for one environment.
 *
 * Patch-style writes (`PATCH /v1/.../config`) so the user can add/update/remove
 * keys without us having to send the whole list. Reveal toggle calls back with
 * `?reveal=true`; the server gates the actual decryption by scope (see
 * `docs/plans/41-application-configuration-d1e00e.md` \u00a7secrets).
 */
export function ConfigEditor({
  projectId,
  environmentId,
}: {
  projectId: string;
  environmentId: string;
}) {
  const [reveal, setReveal] = useState(false);
  const queryClient = useQueryClient();
  const cacheKey = ['config', projectId, environmentId, reveal] as const;

  const configQuery = useQuery({
    queryKey: cacheKey,
    queryFn: () =>
      api.config.list(projectId, environmentId, {
        reveal,
        includeShared: true,
      }),
  });

  const patchMutation = useMutation({
    mutationFn: (req: PatchConfigRequest) =>
      api.config.patch(projectId, environmentId, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['config', projectId, environmentId],
      });
    },
  });

  if (configQuery.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (configQuery.isError) {
    return (
      <p className="text-sm text-danger-600">{configQuery.error.message}</p>
    );
  }

  const entries = configQuery.data.entries;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Environment variables</CardTitle>
          <CardDescription>
            {entries.length} entries \u00b7 version{' '}
            <span className="font-mono">{configQuery.data.versionNumber}</span>
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Switch
            id="reveal"
            checked={reveal}
            onCheckedChange={setReveal}
            aria-label="Reveal secret values"
          />
          <Label htmlFor="reveal" className="cursor-pointer text-fg-muted">
            {reveal ? (
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> Reveal secrets
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <EyeOff className="h-3.5 w-3.5" /> Mask secrets
              </span>
            )}
          </Label>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <AddEntryForm
          onAdd={(input) =>
            patchMutation.mutate(
              {
                upsert: [input],
                remove: [],
                changeSummary: `Add ${input.key}`,
              },
              {
                onSuccess: () => toast.success(`${input.key} added`),
                onError: (err: Error) =>
                  toast.error('Could not save', { description: err.message }),
              },
            )
          }
          pending={patchMutation.isPending}
        />

        <EntriesTable
          entries={entries}
          onRemove={(key) =>
            patchMutation.mutate(
              {
                upsert: [],
                remove: [key],
                changeSummary: `Remove ${key}`,
              },
              {
                onSuccess: () => toast.success(`${key} removed`),
                onError: (err: Error) =>
                  toast.error('Could not remove', { description: err.message }),
              },
            )
          }
        />
      </CardContent>
    </Card>
  );
}

function AddEntryForm({
  onAdd,
  pending,
}: {
  onAdd: (input: { key: string; value: string; kind: 'plain' | 'secret' }) => void;
  pending: boolean;
}) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [kind, setKind] = useState<'plain' | 'secret'>('plain');
  const [error, setError] = useState<string | null>(null);

  // Reset error when the user edits.
  useEffect(() => {
    if (error) setError(null);
  }, [key, value, kind, error]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = ConfigEntryInputSchema.safeParse({ key, value, kind });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? 'Invalid input');
          return;
        }
        onAdd(parsed.data);
        setKey('');
        setValue('');
      }}
      className="grid gap-3 rounded-lg border border-border/70 bg-bg-subtle/40 p-4 md:grid-cols-[1fr_2fr_auto_auto]"
    >
      <div className="space-y-1.5">
        <Label htmlFor="cfg-key" className="text-xs">
          Key
        </Label>
        <Input
          id="cfg-key"
          placeholder="DATABASE_URL"
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase())}
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cfg-value" className="text-xs">
          Value
        </Label>
        <Input
          id="cfg-value"
          placeholder="postgres://\u2026"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type={kind === 'secret' ? 'password' : 'text'}
          className="font-mono"
        />
      </div>
      <div className="flex items-end gap-2 pb-1">
        <Switch
          id="cfg-secret"
          checked={kind === 'secret'}
          onCheckedChange={(checked) => setKind(checked ? 'secret' : 'plain')}
        />
        <Label htmlFor="cfg-secret" className="cursor-pointer text-xs text-fg-muted">
          Secret
        </Label>
      </div>
      <div className="flex items-end">
        <Button type="submit" loading={pending}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>
      {error && (
        <p className="col-span-full text-xs text-danger-600">{error}</p>
      )}
    </form>
  );
}

function EntriesTable({
  entries,
  onRemove,
}: {
  entries: ConfigEntry[];
  onRemove: (key: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/80 p-8 text-center text-sm text-fg-muted">
        No environment variables yet. Add one above to get started.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[28%]">Key</TableHead>
          <TableHead>Value</TableHead>
          <TableHead className="w-[120px]">Source</TableHead>
          <TableHead className="w-[60px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="font-mono text-xs">{entry.key}</TableCell>
            <TableCell className="max-w-[280px] truncate font-mono text-xs">
              {entry.value}
              {entry.kind === 'secret' && entry.masked && entry.valuePreview ? (
                <span className="ml-1 text-fg-subtle">
                  \u2026{entry.valuePreview}
                </span>
              ) : null}
            </TableCell>
            <TableCell>
              <SourceBadge entry={entry} />
            </TableCell>
            <TableCell>
              {entry.source === 'user' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(entry.key)}
                  aria-label={`Remove ${entry.key}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SourceBadge({ entry }: { entry: ConfigEntry }) {
  if (entry.kind === 'secret') {
    return <Badge variant="warning">secret</Badge>;
  }
  switch (entry.source) {
    case 'binding':
      return <Badge variant="outline">binding</Badge>;
    case 'system':
      return <Badge variant="secondary">system</Badge>;
    case 'template':
      return <Badge variant="secondary">template</Badge>;
    default:
      return <Badge variant="outline">user</Badge>;
  }
}
