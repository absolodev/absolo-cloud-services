import { errorFromResponse, AbsoloNetworkError } from './errors.js';

/**
 * SDK construction options.
 */
export interface AbsoloClientOptions {
  /** Base URL of the API. Defaults to `https://api.absolo.cloud`. */
  baseUrl?: string;
  /**
   * Personal Access Token or session token.
   * If omitted, the client relies on the browser's `credentials: 'include'`
   * cookie auth (used by the dashboard).
   */
  token?: string;
  /** Identifier the server can use to attribute calls. Defaults to `@absolo/sdk/<version>`. */
  userAgent?: string;
  /**
   * Override the global `fetch`. Useful in Node test environments and when
   * embedding the SDK in non-browser runtimes.
   */
  fetch?: typeof fetch;
  /** Per-request timeout in ms. Defaults to 30s. */
  timeoutMs?: number;
  /** Hook that fires after every successful response. */
  onResponse?: (info: { method: string; path: string; status: number; durationMs: number }) => void;
}

/** Resolved options with defaults applied. */
interface ResolvedOptions extends Required<Omit<AbsoloClientOptions, 'token' | 'onResponse'>> {
  token?: string;
  onResponse?: AbsoloClientOptions['onResponse'];
}

const DEFAULTS: Omit<ResolvedOptions, 'token' | 'onResponse'> = {
  baseUrl: 'https://api.absolo.cloud',
  userAgent: '@absolo/sdk/0.0.0',
  fetch: globalThis.fetch.bind(globalThis),
  timeoutMs: 30_000,
};

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Low-level HTTP client. Higher-level resource clients (auth, projects, etc.)
 * delegate every call here for consistent auth, timeout, error handling and
 * telemetry.
 *
 * Most consumers should use the `AbsoloClient` facade below, not this class
 * directly.
 */
export class AbsoloHttp {
  readonly options: ResolvedOptions;

  constructor(options: AbsoloClientOptions = {}) {
    this.options = {
      ...DEFAULTS,
      ...options,
    };
  }

  async request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, opts.query);
    const headers = this.buildHeaders(opts.headers, opts.body !== undefined);
    const init: RequestInit = {
      method,
      headers,
      credentials: 'include',
      signal: opts.signal ?? this.timeoutSignal(),
    };
    if (opts.body !== undefined) {
      init.body = JSON.stringify(opts.body);
    }

    const startedAt = performance.now();
    let res: Response;
    try {
      res = await this.options.fetch(url, init);
    } catch (cause) {
      throw new AbsoloNetworkError(
        `Network error during ${method} ${path}`,
        cause,
      );
    }
    const durationMs = performance.now() - startedAt;
    this.options.onResponse?.({ method, path, status: res.status, durationMs });

    if (!res.ok) {
      throw await errorFromResponse(res);
    }
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }

  private buildUrl(path: string, query: RequestOptions['query']): string {
    const url = new URL(path, this.options.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private buildHeaders(extra: Record<string, string> | undefined, hasBody: boolean): HeadersInit {
    const headers: Record<string, string> = {
      accept: 'application/json',
      'user-agent': this.options.userAgent,
      ...extra,
    };
    if (hasBody) {
      headers['content-type'] = 'application/json';
    }
    if (this.options.token) {
      headers['authorization'] = `Bearer ${this.options.token}`;
    }
    return headers;
  }

  private timeoutSignal(): AbortSignal {
    return AbortSignal.timeout(this.options.timeoutMs);
  }
}
