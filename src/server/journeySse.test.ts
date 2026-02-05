import { describe, it, expect, beforeEach, vi } from "vitest";
import { JourneySseManager, formatSseEvent } from "./journeySse";
import { PaymentEventType, createEvent } from "../journey/events";

describe("JourneySseManager", () => {
  let manager: JourneySseManager;

  beforeEach(() => {
    manager = new JourneySseManager();
  });

  it("broadcasts event to registered clients for that session", () => {
    const written: string[] = [];
    const res = {
      write: (chunk: string) => { written.push(chunk); },
      writeHead: () => {},
      setHeader: () => {},
      end: () => {},
    };

    manager.register("s1", res as any);
    const event = createEvent("s1", PaymentEventType.TX_SUBMITTED, { txHash: "abc" });
    manager.broadcast("s1", event);

    expect(written.length).toBe(1);
    expect(written[0]).toContain("event: payment_event");
    expect(written[0]).toContain('"type":"TX_SUBMITTED"');
    expect(written[0]).toContain('"txHash":"abc"');
  });

  it("does not send to clients registered for other sessions", () => {
    const written: string[] = [];
    const res = {
      write: (chunk: string) => { written.push(chunk); },
      writeHead: () => {},
      setHeader: () => {},
      end: () => {},
    };

    manager.register("s2", res as any);
    const event = createEvent("s1", PaymentEventType.TX_SUBMITTED, {});
    manager.broadcast("s1", event);

    expect(written.length).toBe(0);
  });

  it("formatSseEvent returns event: payment_event and data json", () => {
    const event = createEvent("s1", PaymentEventType.SESSION_CREATED, { amount: 10 });
    const out = formatSseEvent(event);
    expect(out).toMatch(/^event: payment_event\n/);
    expect(out).toContain('"sessionId":"s1"');
    expect(out).toContain('"type":"SESSION_CREATED"');
  });
});
