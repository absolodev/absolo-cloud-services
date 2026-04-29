import { describe, expect, it, vi } from 'vitest';
import { AbsoloClient } from '../src/index.js';
import { AbsoloApiError, AbsoloNetworkError } from '../src/errors.js';

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    return await handler(url, init ?? {});
  });
}

describe('AbsoloClient', () => {
  it('serialises body and parses successful JSON', async () => {
    const fetchSpy = mockFetch(
      async () =>
        new Response(
          JSON.stringify({
            id: 'prj_01HZX9ABCDEFGHJKMNPQRSTVWX',
            orgId: 'org_01HZX9ABCDEFGHJKMNPQRSTVWX',
            slug: 'my-app',
            name: 'My App',
            description: '',
            kind: 'app',
            status: 'active',
            region: 'eu-central',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );

    const client = new AbsoloClient({ fetch: fetchSpy as never, token: 'tok_test' });
    const project = await client.projects.create('org_01HZX9ABCDEFGHJKMNPQRSTVWX' as never, {
      slug: 'my-app',
      name: 'My App',
      kind: 'app',
    });

    expect(project.slug).toBe('my-app');
    expect(fetchSpy).toHaveBeenCalledOnce();
    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer tok_test');
    expect(headers['content-type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toMatchObject({ slug: 'my-app' });
  });

  it('throws AbsoloApiError on non-2xx with parsed envelope', async () => {
    const fetchSpy = mockFetch(
      async () =>
        new Response(
          JSON.stringify({
            type: 'https://absolo.cloud/errors/not-found',
            title: 'Project not found',
            status: 404,
            code: 'NOT_FOUND',
            requestId: 'req_abc',
          }),
          { status: 404, headers: { 'content-type': 'application/json' } },
        ),
    );

    const client = new AbsoloClient({ fetch: fetchSpy as never });
    await expect(client.projects.get('prj_01HZX9ABCDEFGHJKMNPQRSTVWX' as never)).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof AbsoloApiError && e.isNotFound() && e.requestId === 'req_abc',
    );
  });

  it('wraps network errors in AbsoloNetworkError', async () => {
    const fetchSpy = mockFetch(async () => {
      throw new TypeError('connection refused');
    });

    const client = new AbsoloClient({ fetch: fetchSpy as never });
    await expect(client.auth.me()).rejects.toBeInstanceOf(AbsoloNetworkError);
  });

  it('returns undefined on 204 No Content', async () => {
    const fetchSpy = mockFetch(async () => new Response(null, { status: 204 }));
    const client = new AbsoloClient({ fetch: fetchSpy as never });
    const result = await client.auth.logout();
    expect(result).toBeUndefined();
  });
});
