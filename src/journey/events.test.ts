import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  PaymentEventType,
  createEvent,
  normalizeSessionId,
  validateSessionId,
  isPaymentJourneyEnabled,
} from "./events";

describe("journey events", () => {
  const origEnv = process.env.PAYMENT_JOURNEY_ENABLED;

  afterEach(() => {
    process.env.PAYMENT_JOURNEY_ENABLED = origEnv;
  });

  describe("createEvent", () => {
    it("creates event with id, sessionId, type, ts, data, level", () => {
      const e = createEvent("s1", PaymentEventType.SESSION_CREATED, { amount: 10 });
      expect(e.id).toMatch(/^evt_\d+_[a-z0-9]+$/);
      expect(e.sessionId).toBe("s1");
      expect(e.type).toBe(PaymentEventType.SESSION_CREATED);
      expect(typeof e.ts).toBe("number");
      expect(e.data).toEqual({ amount: 10 });
      expect(e.level).toBe("info");
    });

    it("accepts custom level", () => {
      const e = createEvent("s1", PaymentEventType.TX_FAILED, { error: "x" }, "error");
      expect(e.level).toBe("error");
    });
  });

  describe("normalizeSessionId", () => {
    it("trims whitespace", () => {
      expect(normalizeSessionId("  s1  ")).toBe("s1");
    });
    it("returns empty for non-string", () => {
      expect(normalizeSessionId(undefined as any)).toBe("");
    });
  });

  describe("validateSessionId", () => {
    it("accepts alphanumeric, underscore, hyphen", () => {
      expect(() => validateSessionId("session-123")).not.toThrow();
      expect(() => validateSessionId("sess_1")).not.toThrow();
    });
    it("throws for empty", () => {
      expect(() => validateSessionId("")).toThrow("sessionId is required");
    });
    it("throws for invalid characters", () => {
      expect(() => validateSessionId("sess/ion")).toThrow("invalid characters");
    });
  });

  describe("isPaymentJourneyEnabled", () => {
    it("returns true when unset or empty", () => {
      delete process.env.PAYMENT_JOURNEY_ENABLED;
      expect(isPaymentJourneyEnabled()).toBe(true);
      process.env.PAYMENT_JOURNEY_ENABLED = "";
      expect(isPaymentJourneyEnabled()).toBe(true);
    });
    it("returns true for true/1", () => {
      process.env.PAYMENT_JOURNEY_ENABLED = "true";
      expect(isPaymentJourneyEnabled()).toBe(true);
      process.env.PAYMENT_JOURNEY_ENABLED = "1";
      expect(isPaymentJourneyEnabled()).toBe(true);
    });
    it("returns false for other values", () => {
      process.env.PAYMENT_JOURNEY_ENABLED = "false";
      expect(isPaymentJourneyEnabled()).toBe(false);
    });
  });
});
