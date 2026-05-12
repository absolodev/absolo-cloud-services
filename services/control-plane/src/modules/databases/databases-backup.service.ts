import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DB, type Database } from '../../db/db.module.js';
import { newId } from '../../common/ids.js';
import { databaseBackups, managedDatabases } from '../../db/schema.js';

@Injectable()
export class DatabasesBackupService {
  private readonly logger = new Logger(DatabasesBackupService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  async createBackup(databaseId: string, kind: 'wal' | 'snapshot' = 'snapshot') {
    // Verify DB exists
    const [database] = await this.db
      .select()
      .from(managedDatabases)
      .where(eq(managedDatabases.id, databaseId));
    if (!database) throw new NotFoundException(`Database ${databaseId} not found`);

    const id = newId('bak');
    const [backup] = await this.db
      .insert(databaseBackups)
      .values({
        id,
        databaseId,
        kind,
        status: 'running',
      })
      .returning();

    // In production: trigger actual backup via the operator
    // For CloudNativePG: create a Backup CR
    // For Percona: trigger XtraBackup
    // For Redis: trigger BGSAVE + RDB snapshot upload

    this.logger.log(`Started ${kind} backup ${id} for database ${databaseId}`);
    return backup;
  }

  async listBackups(databaseId: string) {
    return this.db
      .select()
      .from(databaseBackups)
      .where(eq(databaseBackups.databaseId, databaseId))
      .orderBy(desc(databaseBackups.createdAt));
  }

  async getBackup(backupId: string) {
    const [backup] = await this.db
      .select()
      .from(databaseBackups)
      .where(eq(databaseBackups.id, backupId));
    if (!backup) throw new NotFoundException(`Backup ${backupId} not found`);
    return backup;
  }

  async completeBackup(backupId: string, sizeBytes: number, locationUrl: string) {
    await this.db
      .update(databaseBackups)
      .set({
        status: 'completed',
        completedAt: new Date(),
        sizeBytes,
        locationUrl,
      })
      .where(eq(databaseBackups.id, backupId));

    this.logger.log(`Backup ${backupId} completed (${sizeBytes} bytes)`);
  }

  async failBackup(backupId: string) {
    await this.db
      .update(databaseBackups)
      .set({ status: 'failed', completedAt: new Date() })
      .where(eq(databaseBackups.id, backupId));

    this.logger.warn(`Backup ${backupId} failed`);
  }

  /**
   * Restore a database from a backup — creates a new database instance.
   * In production, this triggers a PITR restore (Postgres) or snapshot restore.
   */
  async restoreFromBackup(backupId: string, newName: string) {
    const backup = await this.getBackup(backupId);

    const [sourceDb] = await this.db
      .select()
      .from(managedDatabases)
      .where(eq(managedDatabases.id, backup.databaseId));

    if (!sourceDb) throw new NotFoundException(`Source database not found`);

    this.logger.log(
      `Restore from backup ${backupId} requested. New instance name: ${newName}. ` +
        `Source: ${sourceDb.engine} ${sourceDb.version}. ` +
        `In production, this would create a new operator CR with restore-from-backup config.`,
    );

    return {
      message: 'Restore initiated',
      backupId,
      sourceEngine: sourceDb.engine,
      sourceVersion: sourceDb.version,
      newName,
    };
  }
}
