import { faker } from '@faker-js/faker';

export interface EnvironmentFixture {
  id: string;
  projectId: string;
  kind: 'production' | 'staging' | 'preview';
  slug: string;
  suspended: boolean;
  createdAt: string;
}

export function makeEnvironment(overrides: Partial<EnvironmentFixture> = {}): EnvironmentFixture {
  const kind = overrides.kind ?? 'production';
  return {
    id: faker.string.uuid(),
    projectId: faker.string.uuid(),
    kind,
    slug: kind,
    suspended: false,
    createdAt: faker.date.recent({ days: 14 }).toISOString(),
    ...overrides,
  };
}
