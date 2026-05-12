import { z } from 'zod';

export const EnterpriseClusterSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  location: z.string(),
  planKind: z.string(),
  regionProxy: z.string().nullable(),
  totalHosts: z.number(),
  complianceTags: z.array(z.string()),
  onboardingStatus: z.enum(['pending', 'provisioning', 'active', 'suspended']),
  contractStart: z.string().nullable(),
  contractEnd: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EnterpriseCluster = z.infer<typeof EnterpriseClusterSchema>;

export const ClusterHostSchema = z.object({
  id: z.string(),
  clusterId: z.string(),
  fqdn: z.string(),
  role: z.enum(['control-plane', 'worker']),
  status: z.enum(['offline', 'online', 'cordoned', 'upgrading']),
  agentVersion: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ClusterHost = z.infer<typeof ClusterHostSchema>;

export const ClusterContractSchema = z.object({
  id: z.string(),
  clusterId: z.string(),
  msaUrl: z.string().nullable(),
  dpaUrl: z.string().nullable(),
  slaTarget: z.string().nullable(),
  slaCreditsTerms: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ClusterContract = z.infer<typeof ClusterContractSchema>;

// API Requests/Responses

export const CreateClusterRequestSchema = z.object({
  name: z.string(),
  location: z.string(),
  complianceTags: z.array(z.string()).optional(),
  regionProxy: z.string().optional(),
});
export type CreateClusterRequest = z.infer<typeof CreateClusterRequestSchema>;

export const CreateClusterResponseSchema = z.object({
  data: EnterpriseClusterSchema,
});
export type CreateClusterResponse = z.infer<typeof CreateClusterResponseSchema>;

export const ListClustersResponseSchema = z.object({
  data: z.array(EnterpriseClusterSchema),
});
export type ListClustersResponse = z.infer<typeof ListClustersResponseSchema>;

export const AddClusterHostRequestSchema = z.object({
  fqdn: z.string(),
  role: z.enum(['control-plane', 'worker']),
});
export type AddClusterHostRequest = z.infer<typeof AddClusterHostRequestSchema>;

export const AddClusterHostResponseSchema = z.object({
  data: ClusterHostSchema,
});
export type AddClusterHostResponse = z.infer<typeof AddClusterHostResponseSchema>;

export const ListClusterHostsResponseSchema = z.object({
  data: z.array(ClusterHostSchema),
});
export type ListClusterHostsResponse = z.infer<typeof ListClusterHostsResponseSchema>;
