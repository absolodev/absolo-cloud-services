import { Injectable, Inject, Logger } from '@nestjs/common';
import { DB, type Database } from '../../db/db.module.js';
import { outbox, sagaState } from '../../db/schema.js';
import { newId } from '../../common/ids.js';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Publishes an event to the transactional outbox.
   * This is intended to be called WITHIN an existing pg transaction
   * so that the domain state and the outbox event commit atomically.
   */
  async publish(tx: any, topic: string, payload: unknown) {
    const id = newId('evt');
    await tx.insert(outbox).values({
      id,
      topic,
      payload,
    });
    this.logger.debug(`Outbox publish: ${topic} [${id}]`);
  }

  /**
   * Starts a saga state machine.
   * Intended to be called within a transaction too.
   */
  async createSaga(tx: any, sagaType: string, context: unknown) {
    const id = newId('sag');
    await tx.insert(sagaState).values({
      id,
      sagaType,
      status: 'STARTED',
      context,
    });
    return id;
  }
}
