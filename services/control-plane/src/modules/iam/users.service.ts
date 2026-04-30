import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { DB, type Database } from '../../db/db.module.js';
import { users } from '../../db/schema.js';
import { newId } from '../../common/ids.js';

/**
 * Users domain service.
 *
 * Owns user records and password hashing. Argon2id is the password hash —
 * defaults match the OWASP guidance (memory ≥ 19 MiB, iterations ≥ 2,
 * parallelism = 1). When OWASP updates, bump the parameters here and add
 * a rehash-on-login path (returns `needsRehash` from `verifyPassword`).
 *
 * Plan refs:
 * - `docs/plans/04-iam-rbac-d1e00e.md`
 * - `docs/plans/26-secrets-management-d1e00e.md`
 */
@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findByEmail(email: string) {
    const normalised = email.toLowerCase().trim();
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, normalised))
      .limit(1);
    return row ?? null;
  }

  async getById(id: string) {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!row) throw new NotFoundException(`User ${id} not found`);
    return row;
  }

  async create(input: { email: string; fullName: string; password: string }) {
    const email = input.email.toLowerCase().trim();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.hashPassword(input.password);
    const id = newId('usr');

    const [row] = await this.db
      .insert(users)
      .values({
        id,
        email,
        fullName: input.fullName,
        passwordHash,
      })
      .returning();
    return row!;
  }

  hashPassword(plaintext: string): Promise<string> {
    return argon2.hash(plaintext, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  verifyPassword(hash: string, plaintext: string): Promise<boolean> {
    return argon2.verify(hash, plaintext).catch(() => false);
  }
}
