import { faker } from '@faker-js/faker';

export interface ProjectFixture {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  region: string;
  createdAt: string;
}

export function makeProject(overrides: Partial<ProjectFixture> = {}): ProjectFixture {
  const name = faker.commerce.productName();
  return {
    id: faker.string.uuid(),
    orgId: faker.string.uuid(),
    slug: faker.helpers.slugify(name).toLowerCase().slice(0, 38),
    name,
    region: faker.helpers.arrayElement(['eu-fra', 'us-iad', 'apac-sg']),
    createdAt: faker.date.recent({ days: 14 }).toISOString(),
    ...overrides,
  };
}
