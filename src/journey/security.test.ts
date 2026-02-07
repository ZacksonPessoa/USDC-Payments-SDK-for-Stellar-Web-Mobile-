
import { createEvent, PaymentEventType } from "./events";
import { describe, it, expect } from "vitest";

describe("Security Validation", () => {
  it("should redact sensitive keys", () => {
    const sensitive = {
      amount: 100,
      secret: "S1234567890SECRET",
      apiKey: "xyz",
      authorization: "Bearer token",
      nested: {
        password: "pass",
        token: "tok"
      }
    };
    const event = createEvent("s1", PaymentEventType.TX_FAILED, sensitive);
    // Keys should exist but be redacted
    expect(event.data).toHaveProperty("secret", "[REDACTED]");
    expect(event.data).toHaveProperty("apiKey", "[REDACTED]");
    expect(event.data).toHaveProperty("authorization", "[REDACTED]");
    expect((event.data as any).nested).toHaveProperty("password", "[REDACTED]");
    expect((event.data as any).nested).toHaveProperty("token", "[REDACTED]");
    expect(event.data).toHaveProperty("amount", 100);
  });

  it("should redact sensitive values (Stellar secrets)", () => {
    // Valid Stellar secret (S + 55 chars)
    const validSecret = "S" + "A".repeat(55);
    const sensitive = {
      someKey: validSecret
    };
    const event = createEvent("s1", PaymentEventType.TX_FAILED, sensitive);
    expect(event.data.someKey).toBe("[REDACTED_SECRET]");
  });

  it("should truncate huge strings", () => {
    const hugeString = "a".repeat(20 * 1024); // 20KB
    const event = createEvent("s1", PaymentEventType.TX_SUBMITTED, { big: hugeString });
    const json = JSON.stringify(event.data);
    expect(json.length).toBeLessThan(12 * 1024); // Should be small due to string truncation
    // Check for suffix
    expect((event.data as any).big).toContain("[TRUNCATED]");
    expect((event.data as any).big.length).toBeLessThan(3000);
  });

  it("should reject overall huge payload even if strings are small", () => {
    // Create many small keys that add up to > 10KB
    const hugeObj: any = {};
    for (let i = 0; i < 1000; i++) {
      hugeObj[`k${i}`] = "v".repeat(20);
    }
    const event = createEvent("s1", PaymentEventType.TX_SUBMITTED, hugeObj);
    // 1000 keys * (3 chars key + 20 chars val) ~ 23KB + overhead
    expect(event.data).toHaveProperty("error", "Payload too large");
    expect(event.data).toHaveProperty("_truncated", true);
  });

  it("should sanitize invalid session IDs", () => {
    const badId = "session/../hack\n\r";
    const event = createEvent(badId, PaymentEventType.SESSION_CREATED);
    expect(event.sessionId).toBe("sessionhack"); // alphanumeric + _ -
    expect(event.sessionId).not.toContain("/");
    expect(event.sessionId).not.toContain(".");
  });

  it("should enforce max session ID length", () => {
     const longId = "a".repeat(300);
     const event = createEvent(longId, PaymentEventType.SESSION_CREATED);
     expect(event.sessionId.length).toBe(256);
  });
});
