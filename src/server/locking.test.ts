import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from './db';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB = 'test_lock.db';

describe('Database Locking', () => {
  let db: Database;

  beforeEach(async () => {
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
    db = new Database(TEST_DB);
    await db.init();
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
  });

  it('should acquire a lock if not taken', async () => {
    const success = await db.acquireLock('test_lock', 1000, 'owner1');
    expect(success).toBe(true);
  });

  it('should prevent another owner from acquiring the same lock', async () => {
    await db.acquireLock('test_lock', 1000, 'owner1');
    const success = await db.acquireLock('test_lock', 1000, 'owner2');
    expect(success).toBe(false);
  });

  it('should allow acquiring if lock expired', async () => {
    await db.acquireLock('test_lock', 10, 'owner1'); // 10ms expiry
    await new Promise(r => setTimeout(r, 50)); // Wait for expiry
    const success = await db.acquireLock('test_lock', 1000, 'owner2');
    expect(success).toBe(true);
  });

  it('should release lock', async () => {
    await db.acquireLock('test_lock', 1000, 'owner1');
    await db.releaseLock('test_lock', 'owner1');
    const success = await db.acquireLock('test_lock', 1000, 'owner2');
    expect(success).toBe(true);
  });

  it('should not release lock if owner mismatch', async () => {
    await db.acquireLock('test_lock', 1000, 'owner1');
    await db.releaseLock('test_lock', 'owner2'); // Wrong owner
    const success = await db.acquireLock('test_lock', 1000, 'owner2');
    expect(success).toBe(false);
  });
});
