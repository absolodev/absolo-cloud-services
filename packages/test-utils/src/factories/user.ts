import { faker } from '@faker-js/faker';

export interface UserFixture {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export function makeUser(overrides: Partial<UserFixture> = {}): UserFixture {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    createdAt: faker.date.recent({ days: 30 }).toISOString(),
    ...overrides,
  };
}
