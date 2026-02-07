
import { createEvent, PaymentEventType } from "../journey/events";
import { Database } from "./db";
import { JourneyStorage } from "./journeyStorage";
import fs from 'fs';
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("Security Fix Verification", () => {
  const dbPath = "audit_fix_test.db";
  let db: Database;
  let storage: JourneyStorage;

  beforeAll(async () => {
    db = new Database(dbPath);
    await db.init();
    storage = new JourneyStorage(db);
  });

  afterAll(async () => {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it("should REDACT sensitive data", async () => {
    const sensitiveData = { secret: "S12345SECRETKEY", apiKey: "secret-api-key" };
    const event = createEvent("session1", PaymentEventType.TX_FAILED, sensitiveData);

    expect(event.data).toHaveProperty("secret", "[REDACTED]");
    expect(event.data).toHaveProperty("apiKey", "[REDACTED]");

    await storage.appendEvent(event);
    const events = await storage.listEvents("session1");
    const storedEvent = events.find(e => e.id === event.id);
    expect(storedEvent?.data).toHaveProperty("secret", "[REDACTED]");
  });

  it("should TRUNCATE huge payloads", () => {
    const hugeString = "a".repeat(10 * 1024 * 1024); // 10MB
    const event = createEvent("session1", PaymentEventType.TX_SUBMITTED, { big: hugeString });
    // The string is truncated to ~2048 chars, so total size is small
    const size = JSON.stringify(event).length;
    expect(size).toBeLessThan(10 * 1024);
    expect((event.data as any).big).toContain("[TRUNCATED]");
  });

  it("should SANITIZE invalid session IDs", () => {
    const invalidSessionId = "session/../invalid";
    const event = createEvent(invalidSessionId, PaymentEventType.SESSION_CREATED);
    expect(event.sessionId).toBe("sessioninvalid");
  });
});
