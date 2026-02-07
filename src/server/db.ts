import sqlite3 from 'sqlite3';
import { PersistenceAdapter, MonitoredPayment } from "./persistence";
import type { PaymentEvent } from "../journey/events";

export class Database implements PersistenceAdapter {
  private db: sqlite3.Database;

  constructor(dbPath: string = 'usdc_payments.db') {
    // verbose() for better stack traces
    const sqlite = sqlite3.verbose();
    this.db = new sqlite.Database(dbPath);
  }

  async init(): Promise<void> {
    const queries = [
      `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        request_json TEXT,
        status TEXT,
        created_at INTEGER,
        expires_at INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS processed_hashes (
        hash TEXT PRIMARY KEY,
        created_at INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS locks (
        key TEXT PRIMARY KEY,
        owner TEXT,
        expires_at INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS payment_journey_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        ts INTEGER NOT NULL,
        data_json TEXT,
        level TEXT,
        tx_hash TEXT,
        ts_bucket INTEGER NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_journey_dedup
        ON payment_journey_events (session_id, type, tx_hash, ts_bucket)`
    ];

    for (const query of queries) {
      await this.run(query);
    }
  }

  async acquireLock(key: string, ttlMs: number, owner: string): Promise<boolean> {
    const now = Date.now();
    const expiresAt = now + ttlMs;

    try {
      await this.run(
        `INSERT INTO locks (key, owner, expires_at) VALUES (?, ?, ?)`,
        [key, owner, expiresAt]
      );
      return true;
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        // Lock exists, check if expired and update atomically
        const changes = await this.runWithChanges(
          `UPDATE locks SET owner = ?, expires_at = ? WHERE key = ? AND expires_at < ?`,
          [owner, expiresAt, key, now]
        );
        return changes > 0;
      }
      throw err;
    }
  }

  async releaseLock(key: string, owner: string): Promise<void> {
    await this.run(`DELETE FROM locks WHERE key = ? AND owner = ?`, [key, owner]);
  }

  async savePayment(payment: MonitoredPayment): Promise<void> {
    await this.run(
      `INSERT OR REPLACE INTO payments (id, request_json, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`,
      [payment.id, JSON.stringify(payment.request), payment.status, payment.createdAt, payment.expiresAt]
    );
  }

  async getPendingPayments(): Promise<MonitoredPayment[]> {
    const rows = await this.all<any>(`SELECT * FROM payments WHERE status = 'pending'`);
    return rows.map(row => ({
      id: row.id,
      request: JSON.parse(row.request_json),
      status: row.status as "pending",
      createdAt: row.created_at,
      expiresAt: row.expires_at
    }));
  }

  async updatePaymentStatus(id: string, status: "confirmed" | "failed"): Promise<void> {
    await this.run(`UPDATE payments SET status = ? WHERE id = ?`, [status, id]);
  }

  async deletePayment(id: string): Promise<void> {
    await this.run(`DELETE FROM payments WHERE id = ?`, [id]);
  }

  async markHashProcessed(hash: string): Promise<void> {
    await this.run(`INSERT OR IGNORE INTO processed_hashes (hash, created_at) VALUES (?, ?)`, [hash, Date.now()]);
  }

  async isHashProcessed(hash: string): Promise<boolean> {
    const row = await this.get<any>(`SELECT hash FROM processed_hashes WHERE hash = ?`, [hash]);
    return !!row;
  }

  async getCursor(): Promise<string> {
    const row = await this.get<any>(`SELECT value FROM meta WHERE key = 'cursor'`);
    return row ? row.value : 'now';
  }

  async saveCursor(cursor: string): Promise<void> {
    await this.run(`INSERT OR REPLACE INTO meta (key, value) VALUES ('cursor', ?)`, [cursor]);
  }

  /**
   * Payment journey: append event (idempotent by session_id + type + tx_hash + ts_bucket).
   * Note: The uniqueness constraint uses a 1-minute bucket (ts_bucket).
   * This means if multiple events of the same type and txHash (or empty hash) occur
   * within the same minute for the same session, only the first one is stored.
   * This is an intentional trade-off to prevent log flooding while capturing key state changes.
   */
  async appendJourneyEvent(event: PaymentEvent): Promise<void> {
    const tsBucket = Math.floor(event.ts / 60000) * 60000;
    const txHash = event.data?.txHash ?? "";
    const dataJson = JSON.stringify(event.data || {});

    // Hard limit on DB payload size (defense in depth)
    // createEvent should handle this, but we protect the DB here too.
    if (dataJson.length > 20 * 1024) {
       console.warn(`[Journey] Dropping event ${event.id} due to excessive size (${dataJson.length} bytes)`);
       return;
    }

    await this.run(
      `INSERT OR IGNORE INTO payment_journey_events (id, session_id, type, ts, data_json, level, tx_hash, ts_bucket)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.sessionId,
        event.type,
        event.ts,
        dataJson,
        event.level || "info",
        txHash,
        tsBucket,
      ]
    );
  }

  /** Payment journey: list events for a session, ordered by ts ASC. */
  async listJourneyEvents(sessionId: string): Promise<PaymentEvent[]> {
    const rows = await this.all<any>(
      `SELECT id, session_id, type, ts, data_json, level FROM payment_journey_events
       WHERE session_id = ? ORDER BY ts ASC`,
      [sessionId]
    );
    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      type: row.type,
      ts: row.ts,
      data: typeof row.data_json === "string" ? JSON.parse(row.data_json) : row.data_json || {},
      level: row.level || "info",
    }));
  }

  async cleanup(now: number): Promise<void> {
    // Delete expired pending payments that are not confirmed
    await this.run(`DELETE FROM payments WHERE status = 'pending' AND expires_at < ?`, [now]);

    // Cleanup processed hashes older than 30 days
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    await this.run(`DELETE FROM processed_hashes WHERE created_at < ?`, [thirtyDaysAgo]);
  }

  // Helper methods to wrap sqlite3 callbacks
  private run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private runWithChanges(sql: string, params: any[] = []): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  private get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  private all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }
}
