import { faker } from '@faker-js/faker';

export interface ConfigEntryFixture {
  id: string;
  projectId: string;
  environmentId: string | null;
  key: string;
  value: string;
  kind: 'plain' | 'secret';
  source: 'user' | 'binding' | 'template' | 'system';
  createdAt: string;
}

export function makeConfigEntry(overrides: Partial<ConfigEntryFixture> = {}): ConfigEntryFixture {
  return {
    id: faker.string.uuid(),
    projectId: faker.string.uuid(),
    environmentId: faker.string.uuid(),
    key: faker.helpers.arrayElement(['LOG_LEVEL', 'PORT', 'DATABASE_URL', 'REDIS_URL', 'NODE_ENV']),
    value: faker.lorem.word(),
    kind: 'plain',
    source: 'user',
    createdAt: faker.date.recent({ days: 7 }).toISOString(),
    ...overrides,
  };
}
