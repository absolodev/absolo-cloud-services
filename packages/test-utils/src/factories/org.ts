import { faker } from '@faker-js/faker';

export interface OrgFixture {
  id: string;
  slug: string;
  name: string;
  plan: 'free' | 'hobby' | 'starter' | 'pro' | 'business' | 'custom';
  createdAt: string;
}

export function makeOrg(overrides: Partial<OrgFixture> = {}): OrgFixture {
  const name = faker.company.name();
  return {
    id: faker.string.uuid(),
    slug: faker.helpers.slugify(name).toLowerCase().slice(0, 38),
    name,
    plan: 'pro',
    createdAt: faker.date.recent({ days: 60 }).toISOString(),
    ...overrides,
  };
}
