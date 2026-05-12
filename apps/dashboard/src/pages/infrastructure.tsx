import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@absolo/ui';
import { Server, ShieldCheck, MapPin, Building2, CheckCircle2, ArrowUpRight } from '@absolo/icons';
import { api } from '@/lib/api';

const DEMO_ORG_ID = 'org_01HZX9DEMO0000000000000000';

export function InfrastructurePage() {
  // For the demo, we mock an enterprise customer or standard customer state.
  const [isEnterprise] = useState(false); // Change to true to preview the cluster view

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Server className="h-5 w-5 text-fg-subtle" />
          Infrastructure
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Manage your dedicated Absolo Enterprise clusters and host nodes.
        </p>
      </header>

      {isEnterprise ? <EnterpriseView orgId={DEMO_ORG_ID} /> : <StandardUpsell />}
    </div>
  );
}

function StandardUpsell() {
  return (
    <Card className="overflow-hidden border-brand-500/20">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-bg to-bg pointer-events-none" />
      <CardHeader className="relative pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-5 w-5 text-brand-500" />
          <Badge
            variant="success"
            className="bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 border-brand-500/20"
          >
            Absolo Enterprise
          </Badge>
        </div>
        <CardTitle className="text-xl">Bring Your Own Infrastructure</CardTitle>
        <CardDescription className="text-sm max-w-2xl mt-2 leading-relaxed">
          Run the full Absolo platform on your own hardware, in your own datacenter, or your
          existing cloud accounts. Maintain absolute data residency and compliance while we manage
          the control plane.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-fg">Strict Data Residency</div>
              <div className="text-xs text-fg-muted mt-1">
                Your data never leaves your network. The control plane operates strictly via
                outbound mTLS.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Server className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-fg">Scale Cost-Effectively</div>
              <div className="text-xs text-fg-muted mt-1">
                Leverage existing hardware investments or volume cloud discounts instead of our
                compute markup.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-fg">Fully Managed</div>
              <div className="text-xs text-fg-muted mt-1">
                We handle k3s upgrades, automated backups, and 24/7 SRE monitoring.
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex items-center gap-4">
          <Button>Contact Sales</Button>
          <Button variant="ghost" className="text-brand-500 hover:text-brand-600">
            Read the whitepaper <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EnterpriseView({ orgId }: { orgId: string }) {
  // Demo data since we don't have a real enterprise org setup in the backend yet
  const clusters = [
    {
      id: 'cluster_01hzx9demo',
      name: 'Frankfurt Colo (FRA-1)',
      location: 'Equinix FR5',
      onboardingStatus: 'active',
      totalHosts: 5,
    },
  ];

  const hosts = [
    {
      id: 'host_1',
      fqdn: 'cp-01.internal',
      role: 'control-plane',
      status: 'online',
      agentVersion: 'v1.4.2',
    },
    {
      id: 'host_2',
      fqdn: 'cp-02.internal',
      role: 'control-plane',
      status: 'online',
      agentVersion: 'v1.4.2',
    },
    {
      id: 'host_3',
      fqdn: 'cp-03.internal',
      role: 'control-plane',
      status: 'online',
      agentVersion: 'v1.4.2',
    },
    {
      id: 'host_4',
      fqdn: 'worker-01.internal',
      role: 'worker',
      status: 'online',
      agentVersion: 'v1.4.2',
    },
    {
      id: 'host_5',
      fqdn: 'worker-02.internal',
      role: 'worker',
      status: 'offline',
      agentVersion: 'v1.4.2',
    },
  ];

  return (
    <div className="space-y-6">
      {clusters.map((cluster) => (
        <div key={cluster.id} className="space-y-4">
          <Card>
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {cluster.name}
                    <Badge
                      variant={cluster.onboardingStatus === 'active' ? 'success' : 'secondary'}
                    >
                      {cluster.onboardingStatus}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5 mt-1">
                    <MapPin className="h-3.5 w-3.5" /> {cluster.location}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold">{cluster.totalHosts}</div>
                  <div className="text-xs text-fg-subtle">Total Nodes</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-sm font-medium mb-3">Provisioned Nodes</div>
              <div className="divide-y divide-border/50 rounded-md border border-border/50">
                {hosts.map((host) => (
                  <div key={host.id} className="flex items-center justify-between p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${host.status === 'online' ? 'bg-emerald-500' : 'bg-destructive'}`}
                      />
                      <span className="font-mono">{host.fqdn}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-fg-subtle">
                      <span>{host.role}</span>
                      <span>Agent: {host.agentVersion}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
