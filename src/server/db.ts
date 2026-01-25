import sqlite3 from 'sqlite3';
import type { PaymentRequest } from "../types/webhook";

export type MonitoredPayment = {
  id: string; // Session ID / Memo
  request: PaymentRequest;
  status: "pending" | "confirmed" | "failed";
  createdAt: number;
  expiresAt: number;
};

export class Database {
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
      )`
    ];

    for (const query of queries) {
      await this.run(query);
    }
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
