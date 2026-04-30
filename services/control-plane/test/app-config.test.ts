import { describe, expect, it } from 'vitest';
import { loadAppConfig } from '../src/config/app-config.js';

describe('app-config', () => {
  it('applies dev defaults when env is empty', () => {
    const cfg = loadAppConfig({});
    expect(cfg.NODE_ENV).toBe('development');
    expect(cfg.PORT).toBe(4000);
    expect(cfg.DATABASE_URL).toMatch(/^postgres:\/\//);
  });

  it('coerces PORT', () => {
    const cfg = loadAppConfig({ PORT: '5050' } as never);
    expect(cfg.PORT).toBe(5050);
  });

  it('rejects invalid DATABASE_URL', () => {
    expect(() => loadAppConfig({ DATABASE_URL: 'not a url' } as never)).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('rejects too-short SESSION_SECRET', () => {
    expect(() => loadAppConfig({ SESSION_SECRET: 'short' } as never)).toThrow(
      /SESSION_SECRET/,
    );
  });
});
