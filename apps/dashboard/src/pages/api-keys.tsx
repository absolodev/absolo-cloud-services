import { useState } from 'react';
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
  toast,
} from '@absolo/ui';
import { KeyRound, Plus, Copy, Trash2, Eye, EyeOff } from '@absolo/icons';

const DEMO_KEYS = [
  {
    id: 'key_1',
    name: 'production-deploy',
    prefix: 'abs_live_',
    lastUsed: '2026-04-30T18:00:00Z',
    createdAt: '2026-04-01T10:00:00Z',
    scopes: ['projects:read', 'apps:deploy'],
  },
  {
    id: 'key_2',
    name: 'ci-pipeline',
    prefix: 'abs_live_',
    lastUsed: '2026-04-28T12:00:00Z',
    createdAt: '2026-04-15T10:00:00Z',
    scopes: ['projects:read', 'apps:deploy', 'databases:read'],
  },
];

export function ApiKeysPage() {
  const [keys, setKeys] = useState(DEMO_KEYS);

  const handleRevoke = (id: string) => {
    setKeys(keys.filter((k) => k.id !== id));
    toast.success('API key revoked');
  };

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <header className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-fg-subtle" />
            API Keys
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Create and manage API keys for programmatic access.
          </p>
        </div>
        <CreateKeyDialog />
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Keys</CardTitle>
          <CardDescription>{keys.length} API keys</CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-fg-muted">No API keys. Create one to get started.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-fg">{key.name}</span>
                      <span className="font-mono text-xs text-fg-subtle">{key.prefix}••••••••</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {key.scopes.map((scope) => (
                        <Badge key={scope} variant="outline" className="text-[10px] font-mono">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-fg-subtle">
                      Last used {new Date(key.lastUsed).toLocaleDateString()} · Created{' '}
                      {new Date(key.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => handleRevoke(key.id)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 rounded-xl border border-border/70 bg-bg-subtle/40 p-4 text-sm text-fg-muted">
        <strong className="text-fg">Tip:</strong> API keys inherit your organisation's permissions.
        Use scoped keys with minimal permissions for CI/CD pipelines. Keys cannot be viewed again
        after creation — store them securely.
      </div>
    </div>
  );
}

function CreateKeyDialog() {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    const fakeKey = `abs_live_${Math.random().toString(36).slice(2, 18)}`;
    setCreatedKey(fakeKey);
  };

  const handleCopy = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      toast.success('Key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setName('');
    setCreatedKey(null);
    setCopied(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          Create key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{createdKey ? 'Key created' : 'Create API key'}</DialogTitle>
          <DialogDescription>
            {createdKey
              ? 'Copy this key now. You will not be able to see it again.'
              : 'Give your key a descriptive name for easy identification.'}
          </DialogDescription>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-bg-subtle p-3">
              <code className="flex-1 font-mono text-sm text-fg break-all">{createdKey}</code>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning-700">
              <Eye className="h-4 w-4 flex-none" />
              This is the only time this key will be shown. Store it securely.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Key name</Label>
              <Input
                placeholder="production-deploy"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {createdKey ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!name.trim()}>
                Create key
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
