import { useState } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle, Input } from '@absolo/ui';
import { Server, Cpu, HardDrive, Wifi, Plus } from '@absolo/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const HOSTS = [
  {
    hostname: 'htz-fsn1-node-01',
    region: 'eu-central',
    status: 'ready',
    cpu: '32 vCPU',
    ram: '128 GB',
    pods: 87,
    uptime: '42d 7h',
  },
  {
    hostname: 'htz-fsn1-node-02',
    region: 'eu-central',
    status: 'ready',
    cpu: '32 vCPU',
    ram: '128 GB',
    pods: 79,
    uptime: '42d 7h',
  },
  {
    hostname: 'htz-fsn1-node-03',
    region: 'eu-central',
    status: 'ready',
    cpu: '32 vCPU',
    ram: '128 GB',
    pods: 92,
    uptime: '38d 3h',
  },
  {
    hostname: 'htz-fsn1-node-04',
    region: 'eu-central',
    status: 'ready',
    cpu: '64 vCPU',
    ram: '256 GB',
    pods: 145,
    uptime: '20d 1h',
  },
  {
    hostname: 'htz-fsn1-node-05',
    region: 'eu-central',
    status: 'ready',
    cpu: '64 vCPU',
    ram: '256 GB',
    pods: 138,
    uptime: '20d 1h',
  },
  {
    hostname: 'htz-fsn1-node-06',
    region: 'eu-central',
    status: 'draining',
    cpu: '32 vCPU',
    ram: '128 GB',
    pods: 12,
    uptime: '60d 11h',
  },
  {
    hostname: 'htz-hel1-node-01',
    region: 'eu-west',
    status: 'ready',
    cpu: '32 vCPU',
    ram: '128 GB',
    pods: 54,
    uptime: '15d 2h',
  },
  {
    hostname: 'htz-hel1-node-02',
    region: 'eu-west',
    status: 'ready',
    cpu: '32 vCPU',
    ram: '128 GB',
    pods: 48,
    uptime: '15d 2h',
  },
  {
    hostname: 'htz-hel1-node-03',
    region: 'eu-west',
    status: 'ready',
    cpu: '32 vCPU',
    ram: '128 GB',
    pods: 51,
    uptime: '15d 2h',
  },
  {
    hostname: 'htz-hel1-node-04',
    region: 'eu-west',
    status: 'ready',
    cpu: '32 vCPU',
    ram: '128 GB',
    pods: 45,
    uptime: '15d 2h',
  },
];

/**
 * Fleet page — hosts, regions, capacity.
 * Uses mock data until the fleet module ships its `/admin/fleet` endpoints.
 */
export function FleetPage() {
  const [filter, setFilter] = useState('');

  const regionsQuery = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.platform.listRegions(),
  });
  const regions = regionsQuery.data?.data ?? [];

  const filteredHosts = HOSTS.filter(
    (h) => h.hostname.includes(filter.toLowerCase()) || h.region.includes(filter.toLowerCase()),
  );

  const statusColor = (s: string) => {
    switch (s) {
      case 'healthy':
      case 'ready':
        return 'success';
      case 'draining':
        return 'warning';
      case 'provisioning':
        return 'secondary';
      case 'unhealthy':
      case 'offline':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-6">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">fleet</h1>
        <p className="mt-1 font-mono text-xs text-fg-muted">regions · hosts · capacity</p>
      </header>

      {/* Region cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {regionsQuery.isPending && (
          <div className="col-span-3 text-sm text-fg-muted">Loading regions...</div>
        )}
        {regions.map((region) => (
          <Card key={region.code}>
            <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="font-mono text-base">{region.name}</CardTitle>
                <div className="mt-1 font-mono text-xs text-fg-subtle">{region.code}</div>
              </div>
              <Badge variant={statusColor(region.status)} className="text-[10px] uppercase">
                {region.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-y-4 font-mono text-xs">
                <div>
                  <div className="text-fg-subtle mb-1">Capabilities</div>
                  <div className="text-fg truncate">{region.capabilities.length} active</div>
                </div>
                <div>
                  <div className="text-fg-subtle mb-1">Joined</div>
                  <div className="text-fg">{new Date(region.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Host table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="font-mono text-base">hosts</CardTitle>
          <Input
            placeholder="Filter by hostname or region…"
            className="max-w-xs text-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-left font-mono uppercase tracking-wider text-fg-subtle">
                  <th className="pb-2 pr-4">hostname</th>
                  <th className="pb-2 pr-4">region</th>
                  <th className="pb-2 pr-4">status</th>
                  <th className="pb-2 pr-4">cpu</th>
                  <th className="pb-2 pr-4">ram</th>
                  <th className="pb-2 pr-4">pods</th>
                  <th className="pb-2">uptime</th>
                </tr>
              </thead>
              <tbody>
                {filteredHosts.map((host) => (
                  <tr
                    key={host.hostname}
                    className="border-b border-border/30 hover:bg-bg-subtle/30 transition-colors"
                  >
                    <td className="py-2.5 pr-4 font-mono font-medium text-fg">
                      <span className="flex items-center gap-2">
                        <Server className="h-3 w-3 text-fg-subtle" />
                        {host.hostname}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-fg-muted">{host.region}</td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={statusColor(host.status) as any} className="text-[10px]">
                        {host.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-fg-muted">
                      <span className="flex items-center gap-1">
                        <Cpu className="h-3 w-3" />
                        {host.cpu}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-fg-muted">
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {host.ram}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-fg">{host.pods}</td>
                    <td className="py-2.5 font-mono text-fg-muted">{host.uptime}</td>
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
