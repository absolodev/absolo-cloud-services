import { Module, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule, DB, type Database } from '../src/db/db.module.js';
import { users, orgs, projects, environments } from '../src/db/schema.js';
import { hashPassword } from '../src/modules/iam/crypto.js';
import { newId } from '../src/common/ids.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule],
})
class SeedModule {}

async function bootstrap() {
  const logger = new Logger('Seeder');
  const app = await NestFactory.createApplicationContext(SeedModule);
  const db = app.get<Database>(DB);

  logger.log('Starting DB seed...');

  try {
    // 1. Create dev user
    const devUserId = newId('usr');
    const hashedPassword = await hashPassword('password');

    await db
      .insert(users)
      .values({
        id: devUserId,
        email: 'dev@absolo.local',
        passwordHash: hashedPassword,
        name: 'Dev User',
      })
      .onConflictDoNothing();
    logger.log('Inserted dev user (dev@absolo.local / password)');

    // 2. Create organization
    const orgId = newId('org');
    await db
      .insert(orgs)
      .values({
        id: orgId,
        slug: 'dev-org',
        name: 'Absolo Local Dev',
        ownerId: devUserId,
        stripeCustomerId: 'cus_dev',
        subscriptionStatus: 'active',
      })
      .onConflictDoNothing();
    logger.log('Inserted dev org');

    // 3. Create project
    const projId = newId('prj');
    await db
      .insert(projects)
      .values({
        id: projId,
        orgId,
        name: 'Demo Project',
      })
      .onConflictDoNothing();
    logger.log('Inserted demo project');

    // 4. Create base environments
    const envProdId = newId('env');
    await db
      .insert(environments)
      .values({
        id: envProdId,
        projectId: projId,
        name: 'Production',
        type: 'production',
      })
      .onConflictDoNothing();

    const envStagId = newId('env');
    await db
      .insert(environments)
      .values({
        id: envStagId,
        projectId: projId,
        name: 'Staging',
        type: 'preview',
      })
      .onConflictDoNothing();
    logger.log('Inserted demo environments');

    logger.log('Seeding completed successfully.');
  } catch (err) {
    logger.error('Failed to seed db:', err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
