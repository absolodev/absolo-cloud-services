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
import { Users, Plus, Mail, Shield, Trash2 } from '@absolo/icons';

const DEMO_MEMBERS = [
  { id: 'user_1', email: 'nika@absolo.cloud', name: 'Nika', role: 'owner', joinedAt: '2026-04-01' },
  {
    id: 'user_2',
    email: 'alice@absolo.cloud',
    name: 'Alice',
    role: 'admin',
    joinedAt: '2026-04-15',
  },
  {
    id: 'user_3',
    email: 'bob@absolo.cloud',
    name: 'Bob',
    role: 'developer',
    joinedAt: '2026-05-01',
  },
];

const ROLE_VARIANTS: Record<string, 'default' | 'success' | 'secondary' | 'warning'> = {
  owner: 'success',
  admin: 'warning',
  developer: 'secondary',
  viewer: 'default',
};

export function TeamPage() {
  const [members, setMembers] = useState(DEMO_MEMBERS);

  const handleRemove = (id: string) => {
    setMembers(members.filter((m) => m.id !== id));
    toast.success('Member removed');
  };

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <header className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-fg-subtle" />
            Team
          </h1>
          <p className="mt-1 text-sm text-fg-muted">Manage members, roles, and invitations.</p>
        </div>
        <InviteDialog />
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>{members.length} team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/50">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/10 text-sm font-semibold text-brand-600">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-fg">{member.name}</div>
                    <div className="text-xs text-fg-muted">{member.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={ROLE_VARIANTS[member.role] ?? 'default'}>{member.role}</Badge>
                  <span className="text-xs text-fg-subtle">
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </span>
                  {member.role !== 'owner' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(member.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InviteDialog() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('developer');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            Send an invitation email. They will need to create an Absolo account to join.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-fg-subtle" />
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <select
              className="w-full rounded-md border border-border/60 bg-bg px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="developer">Developer</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              toast.success(`Invitation sent to ${email}`);
              setEmail('');
              setOpen(false);
            }}
            disabled={!email}
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
