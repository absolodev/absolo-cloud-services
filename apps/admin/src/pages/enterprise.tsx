import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@absolo/ui';
import { Building2, Server, MapPin, MoreHorizontal, Plus } from '@absolo/icons';

// In a real app we'd fetch from `api.admin.listEnterpriseClusters()`
// But for the demo we'll use static data for the admin view.
const DEMO_CLUSTERS = [
  {
    id: 'cluster_01hzx9demo',
    orgId: 'org_01HZX9DEMO0000000000000000',
    orgName: 'Acme Corp',
    name: 'Frankfurt Colo (FRA-1)',
    location: 'Equinix FR5',
    onboardingStatus: 'active',
    totalHosts: 5,
    createdAt: '2026-04-10T10:00:00Z',
  },
  {
    id: 'cluster_02abcxyz',
    orgId: 'org_02ABCXYZ0000000000000000',
    orgName: 'Globex Inc',
    name: 'AWS GovCloud (US-East)',
    location: 'us-gov-east-1',
    onboardingStatus: 'provisioning',
    totalHosts: 3,
    createdAt: '2026-05-01T08:30:00Z',
  },
];

export function EnterpriseAdminPage() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-fg-subtle" />
            Enterprise Clusters
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Manage BYO Infrastructure clusters and track onboarding pipelines.
          </p>
        </div>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          Provision Cluster
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Global Fleet</CardTitle>
          <CardDescription>{DEMO_CLUSTERS.length} BYO clusters under management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-bg-subtle text-left text-xs font-medium text-fg-subtle">
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium">Cluster Name</th>
                  <th className="p-3 font-medium">Location</th>
                  <th className="p-3 font-medium">Hosts</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Created</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {DEMO_CLUSTERS.map((cluster) => (
                  <tr key={cluster.id} className="hover:bg-bg-subtle/50 transition-colors">
                    <td className="p-3">
                      <div className="font-medium text-fg">{cluster.orgName}</div>
                      <div className="font-mono text-[10px] text-fg-subtle">{cluster.orgId}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 font-medium text-fg">
                        <Server className="h-3.5 w-3.5 text-brand-500" />
                        {cluster.name}
                      </div>
                      <div className="font-mono text-[10px] text-fg-subtle">{cluster.id}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 text-fg-muted">
                        <MapPin className="h-3 w-3" />
                        {cluster.location}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-fg">{cluster.totalHosts}</td>
                    <td className="p-3">
                      <Badge
                        variant={cluster.onboardingStatus === 'active' ? 'success' : 'warning'}
                      >
                        {cluster.onboardingStatus}
                      </Badge>
                    </td>
                    <td className="p-3 text-fg-muted">
                      {new Date(cluster.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
