/**
 * Payment journey storage: append events (idempotent) and list by session.
 * Uses existing Database (SQLite). Optionally broadcasts to SSE on append.
 */

import type { PaymentEvent } from "../journey/events";
import type { JourneySseManager } from "./journeySse";

export interface JourneyStorageAdapter {
  appendEvent(event: PaymentEvent): Promise<void>;
  listEvents(sessionId: string): Promise<PaymentEvent[]>;
}

/** DB-like interface for journey events (Database implements this). */
export interface JourneyStorageDb {
  appendJourneyEvent(event: PaymentEvent): Promise<void>;
  listJourneyEvents(sessionId: string): Promise<PaymentEvent[]>;
}

export class JourneyStorage implements JourneyStorageAdapter {
  constructor(
    private db: JourneyStorageDb,
    private sse?: JourneySseManager
  ) {}

  async appendEvent(event: PaymentEvent): Promise<void> {
    await this.db.appendJourneyEvent(event);
    this.sse?.broadcast(event.sessionId, event);
  }

  async listEvents(sessionId: string): Promise<PaymentEvent[]> {
    return this.db.listJourneyEvents(sessionId);
  }
}
