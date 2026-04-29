import { describe, expect, it } from 'vitest';
import { ConfigKeySchema, ConfigEntryInputSchema, CONFIG_LIMITS } from '../src/config/config-entry.js';
import { IdSchema, SlugSchema } from '../src/common/primitives.js';
import { ApiErrorSchema, ERROR_CODES } from '../src/errors.js';
import { CreateProjectRequestSchema } from '../src/projects/projects.js';

describe('common primitives', () => {
  it('accepts a valid prefixed ULID', () => {
    expect(IdSchema.safeParse('prj_01HZX9ABCDEFGHJKMNPQRSTVWX').success).toBe(true);
  });

  it.each<string>([
    'invalid',
    'PRJ_01HZX9ABCDEFGHJKMNPQRSTVWX', // uppercase prefix
    'prj_short',
    '_01HZX9ABCDEFGHJKMNPQRSTVWX',
    'prj-01HZX9ABCDEFGHJKMNPQRSTVWX', // wrong separator
  ])('rejects invalid id: %s', (bad: string) => {
    expect(IdSchema.safeParse(bad).success).toBe(false);
  });

  it.each<string>(['my-app', 'staging-1', 'demo'])('accepts valid slug: %s', (s: string) => {
    expect(SlugSchema.safeParse(s).success).toBe(true);
  });

  it.each<string>(['-bad', 'bad-', 'bad--bad', 'BAD', 'a', 'with space'])(
    'rejects invalid slug: %s',
    (s: string) => {
      expect(SlugSchema.safeParse(s).success).toBe(false);
    },
  );
});

describe('config-entry', () => {
  it('accepts well-formed keys', () => {
    expect(ConfigKeySchema.safeParse('FOO').success).toBe(true);
    expect(ConfigKeySchema.safeParse('FOO_BAR_123').success).toBe(true);
    expect(ConfigKeySchema.safeParse('_PRIVATE').success).toBe(true);
  });

  it('rejects lowercase keys', () => {
    expect(ConfigKeySchema.safeParse('foo').success).toBe(false);
  });

  it('rejects keys starting with a digit', () => {
    expect(ConfigKeySchema.safeParse('1FOO').success).toBe(false);
  });

  it('rejects ABSOLO_* (reserved prefix)', () => {
    expect(ConfigKeySchema.safeParse('ABSOLO_VERSION_ID').success).toBe(false);
  });

  it('defaults entry kind to plain', () => {
    const r = ConfigEntryInputSchema.parse({ key: 'FOO', value: 'bar' });
    expect(r.kind).toBe('plain');
  });

  it('rejects entries with values exceeding the byte cap', () => {
    const huge = 'x'.repeat(CONFIG_LIMITS.VALUE_MAX_BYTES + 1);
    expect(ConfigEntryInputSchema.safeParse({ key: 'FOO', value: huge }).success).toBe(false);
  });
});

describe('errors envelope', () => {
  it('round-trips a valid error', () => {
    const err = {
      type: 'https://absolo.cloud/errors/validation',
      title: 'Validation failed',
      status: 422,
      code: ERROR_CODES.VALIDATION_FAILED,
      requestId: 'req_abc',
      errors: [{ path: ['email'], code: 'invalid_email', message: 'not an email' }],
    };
    expect(ApiErrorSchema.safeParse(err).success).toBe(true);
  });
});

describe('projects.CreateProjectRequest', () => {
  it('accepts the minimum required fields', () => {
    const r = CreateProjectRequestSchema.safeParse({
      slug: 'my-app',
      name: 'My App',
      kind: 'app',
    });
    expect(r.success).toBe(true);
  });

  it('rejects unknown extra fields (strict mode)', () => {
    const r = CreateProjectRequestSchema.safeParse({
      slug: 'my-app',
      name: 'My App',
      kind: 'app',
      // @ts-expect-error
      bogus: true,
    });
    expect(r.success).toBe(false);
  });
});
