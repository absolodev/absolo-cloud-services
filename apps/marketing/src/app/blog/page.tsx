import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Engineering updates, product announcements, and infrastructure deep-dives from the Absolo team.',
};

const POSTS = [
  {
    title: 'Introducing Absolo Cloud — boring deploys, predictable bills',
    excerpt:
      'Today we are launching Absolo Cloud in public beta. Here is why we built it and what makes it different.',
    date: 'Oct 15, 2026',
    slug: 'introducing-absolo-cloud',
  },
  {
    title: 'How we provision managed Postgres in under 60 seconds',
    excerpt:
      'A deep dive into our CloudNativePG integration, operator lifecycle, and the saga pattern that orchestrates it.',
    date: 'Oct 8, 2026',
    slug: 'managed-postgres-under-60s',
  },
  {
    title: 'Why we chose Hetzner over AWS for our data plane',
    excerpt:
      'Cost transparency, bare-metal performance, and EU data residency. Our infrastructure reasoning explained.',
    date: 'Sep 28, 2026',
    slug: 'why-hetzner',
  },
];

export default function BlogPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Blog</h1>
        <p className="mt-4 text-lg text-fg-muted">
          Engineering updates, product announcements, and infrastructure deep-dives.
        </p>
      </div>

      <div className="mt-14 space-y-8">
        {POSTS.map((post) => (
          <article
            key={post.slug}
            className="group rounded-xl border border-border/70 bg-bg-elevated p-6 transition-shadow hover:shadow-md"
          >
            <time className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
              {post.date}
            </time>
            <h2 className="mt-2 text-xl font-semibold tracking-tight group-hover:text-brand-500 transition-colors">
              {post.title}
            </h2>
            <p className="mt-2 text-sm text-fg-muted leading-relaxed">{post.excerpt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
