import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import { Database } from "./db";
import { JourneyStorage } from "./journeyStorage";
import { JourneySseManager } from "./journeySse";
import { PaymentEventType, createEvent } from "../journey/events";

const TEST_DB = "test_journey.db";

describe("JourneyStorage", () => {
  let db: Database;
  let storage: JourneyStorage;

  beforeEach(async () => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    db = new Database(TEST_DB);
    await db.init();
    storage = new JourneyStorage(db);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  describe("appendEvent idempotency", () => {
    it("does not duplicate same session+type+txHash+ts_bucket", async () => {
      const ts = Date.now();
      const e1 = createEvent("s1", PaymentEventType.TX_SUBMITTED, { txHash: "abc" });
      e1.ts = ts;
      e1.id = "id1";
      const e2 = createEvent("s1", PaymentEventType.TX_SUBMITTED, { txHash: "abc" });
      e2.ts = ts;
      e2.id = "id2";

      await storage.appendEvent(e1);
      await storage.appendEvent(e2);

      const list = await storage.listEvents("s1");
      expect(list.length).toBe(1);
      expect(list[0].id).toBe("id1");
    });

    it("allows same type with different txHash", async () => {
      await storage.appendEvent(
        createEvent("s1", PaymentEventType.TX_SUBMITTED, { txHash: "hash1" })
      );
      await storage.appendEvent(
        createEvent("s1", PaymentEventType.TX_SUBMITTED, { txHash: "hash2" })
      );
      const list = await storage.listEvents("s1");
      expect(list.length).toBe(2);
    });
  });

  describe("listEvents ordering", () => {
    it("returns events ordered by ts ASC", async () => {
      const base = Date.now();
      const e1 = createEvent("s1", PaymentEventType.SESSION_CREATED, {});
      e1.ts = base;
      const e2 = createEvent("s1", PaymentEventType.TX_SUBMITTED, {});
      e2.ts = base + 100;
      const e3 = createEvent("s1", PaymentEventType.TX_CONFIRMED, {});
      e3.ts = base + 200;
      await storage.appendEvent(e1);
      await storage.appendEvent(e2);
      await storage.appendEvent(e3);

      const list = await storage.listEvents("s1");
      expect(list.length).toBe(3);
      expect(list[0].ts).toBeLessThanOrEqual(list[1].ts);
      expect(list[1].ts).toBeLessThanOrEqual(list[2].ts);
      expect(list.map((x) => x.type)).toEqual([
        PaymentEventType.SESSION_CREATED,
        PaymentEventType.TX_SUBMITTED,
        PaymentEventType.TX_CONFIRMED,
      ]);
    });
  });

  describe("SSE stream returns events as they arrive", () => {
    it("broadcasts to SSE client when appendEvent is called", async () => {
      const sse = new JourneySseManager();
      const storageWithSse = new JourneyStorage(db, sse);
      const written: string[] = [];
      const res = {
        write: (chunk: string) => { written.push(chunk); },
        writeHead: () => {},
        setHeader: () => {},
        end: () => {},
      };
      sse.register("s1", res as any);

      const event = createEvent("s1", PaymentEventType.TX_SUBMITTED, { txHash: "h1" });
      await storageWithSse.appendEvent(event);

      expect(written.length).toBe(1);
      expect(written[0]).toContain("event: payment_event");
      expect(written[0]).toContain("h1");
    });
  });
});
