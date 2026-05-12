import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Managed Services',
  description:
    'Postgres, MySQL, Redis, and S3-compatible object storage — fully managed on Absolo Cloud.',
};

export default function ManagedDocsPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">Managed Services</h1>
      <p className="mt-4 text-lg text-fg-muted">
        Databases and object storage, provisioned in seconds, managed for you.
      </p>

      <div className="mt-12 prose prose-invert max-w-none text-fg-muted space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-fg">Managed Postgres</h2>
          <p>Powered by CloudNativePG. Features include:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Automated backups with point-in-time recovery</li>
            <li>High-availability with synchronous replicas</li>
            <li>Parameter groups for custom tuning</li>
            <li>Branch databases for PR previews (Pro+)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-fg">Managed MySQL</h2>
          <p>
            Powered by Percona XtraDB Cluster. Galera-based multi-primary replication for high
            availability.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-fg">Managed Redis</h2>
          <p>
            Powered by Spotahome RedisFailover. Sentinel-based automatic failover with persistence
            options.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-fg">Object Storage (S3-compatible)</h2>
          <p>Powered by SeaweedFS. Each bucket gets:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>S3-compatible API endpoint</li>
            <li>Per-app access keys</li>
            <li>Lifecycle rules for automatic expiry</li>
            <li>Optional public-read access</li>
            <li>Versioning support</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-fg">Bindings</h2>
          <p>Bind any database or bucket to your app. When you bind, Absolo automatically:</p>
          <ol className="list-decimal pl-6 space-y-1">
            <li>Creates a dedicated set of credentials for that app</li>
            <li>
              Injects connection strings as environment variables (<code>DATABASE_URL</code>,{' '}
              <code>REDIS_URL</code>, <code>S3_ENDPOINT</code>, etc.)
            </li>
            <li>Rotates credentials if you unbind and re-bind</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
