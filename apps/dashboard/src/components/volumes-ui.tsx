import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Skeleton,
} from '@absolo/ui';
import { api } from '@/lib/api';

/**
 * Phase 2: Persistent Volume Management UI and Snapshots
 */
export function VolumesUI({
  projectId,
  environmentId,
}: {
  projectId: string;
  environmentId: string;
}) {
  const queryClient = useQueryClient();
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Mocked API definitions for Phase 2 PVs. Should go to API SDK later.
  const volumesQuery = useQuery({
    queryKey: ['volumes', environmentId],
    queryFn: async () => {
      // Mock data for Phase 2 UX
      return [
        {
          id: 'vol-123',
          name: 'wp-content',
          size_gb: 5,
          used_gb: 2.1,
          status: 'attached',
          app_id: 'app-456',
          snapshots: [
            {
              id: 'snap-1',
              created_at: new Date(Date.now() - 86400000).toISOString(),
              size_mb: 450,
            },
            { id: 'snap-2', created_at: new Date().toISOString(), size_mb: 455 },
          ],
        },
      ];
    },
  });

  const snapshotMutation = useMutation({
    mutationFn: async (volumeId: string) => {
      // Mock API call to create snapshot
      await new Promise((r) => setTimeout(r, 1000));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volumes', environmentId] });
      setIsCreatingSnapshot(false);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ volumeId, snapshotId }: { volumeId: string; snapshotId: string }) => {
      // Mock API call to restore
      await new Promise((r) => setTimeout(r, 1500));
      return { success: true };
    },
    onSuccess: () => {
      alert('Volume restored successfully.');
    },
  });

  if (volumesQuery.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }

  const volumes = volumesQuery.data || [];

  return (
    <div className="space-y-6">
      {volumes.map((vol) => (
        <Card key={vol.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{vol.name}</CardTitle>
              <CardDescription>
                {vol.used_gb} GB used of {vol.size_gb} GB \u2022 Attached to app {vol.app_id}
              </CardDescription>
            </div>
            <Badge variant="success">{vol.status}</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold">Snapshots (Longhorn + Restic)</h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsCreatingSnapshot(true);
                  snapshotMutation.mutate(vol.id);
                }}
                disabled={isCreatingSnapshot}
              >
                {isCreatingSnapshot ? 'Creating...' : 'Take Snapshot'}
              </Button>
            </div>

            {vol.snapshots.length === 0 ? (
              <p className="text-sm text-fg-muted">No snapshots taken yet.</p>
            ) : (
              <ul className="space-y-2 border rounded-md divide-y overflow-hidden">
                {vol.snapshots.map((snap) => (
                  <li
                    key={snap.id}
                    className="flex items-center justify-between p-3 text-sm bg-bg-subtle"
                  >
                    <div>
                      <span className="font-mono text-fg-muted mr-3">{snap.id}</span>
                      <span>
                        {new Date(snap.created_at).toLocaleString()} ({snap.size_mb} MB)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (
                          confirm(
                            'Are you sure you want to restore this snapshot? The app will experience brief downtime.',
                          )
                        ) {
                          restoreMutation.mutate({ volumeId: vol.id, snapshotId: snap.id });
                        }
                      }}
                      disabled={restoreMutation.isPending}
                    >
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}

      {volumes.length === 0 && (
        <p className="text-sm text-fg-muted">No persistent volumes in this environment.</p>
      )}
    </div>
  );
}
