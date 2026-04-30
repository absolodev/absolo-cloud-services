/**
 * Fleet page \u2014 hosts, regions, capacity. Real data lands once the fleet
 * module (`docs/plans/22-multi-region-networking-d1e00e.md`) ships its
 * `/admin/fleet` endpoints. Until then this is a placeholder so the route
 * shape is right.
 */
export function FleetPage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-6">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">fleet</h1>
        <p className="mt-1 font-mono text-xs text-fg-muted">
          regions \u00b7 hosts \u00b7 capacity
        </p>
      </header>
      <div className="rounded-lg border border-dashed border-border/80 p-12 text-center font-mono text-xs text-fg-muted">
        fleet endpoints not yet wired \u2014 see plan 22
      </div>
    </div>
  );
}
