/**
 * Payment Journey event schema and helpers.
 * Used for observability: session created → wallet → tx submitted → horizon → webhook.
 * Feature can be disabled via PAYMENT_JOURNEY_ENABLED=false.
 */

export enum PaymentEventType {
  SESSION_CREATED = "SESSION_CREATED",
  WALLET_CONNECTED = "WALLET_CONNECTED",
  TX_SIGN_REQUESTED = "TX_SIGN_REQUESTED",
  TX_SUBMITTED = "TX_SUBMITTED",
  TX_SEEN_ON_NETWORK = "TX_SEEN_ON_NETWORK",
  TX_CONFIRMED = "TX_CONFIRMED",
  TX_FAILED = "TX_FAILED",
  WEBHOOK_SENT = "WEBHOOK_SENT",
  WEBHOOK_ACKED = "WEBHOOK_ACKED",
}

export type PaymentEventLevel = "info" | "warn" | "error";

export interface PaymentEventData {
  txHash?: string;
  memoHash?: string;
  amount?: number;
  asset?: string;
  from?: string;
  to?: string;
  network?: string;
  error?: string;
  [key: string]: unknown;
}

export interface PaymentEvent {
  id: string;
  sessionId: string;
  type: PaymentEventType;
  ts: number;
  data: PaymentEventData;
  level?: PaymentEventLevel;
}

const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_SESSION_ID_LENGTH = 256;

/**
 * Create a payment journey event with a unique id and timestamp.
 */
export function createEvent(
  sessionId: string,
  type: PaymentEventType,
  data: PaymentEventData = {},
  level: PaymentEventLevel = "info"
): PaymentEvent {
  const normalized = normalizeSessionId(sessionId);
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    sessionId: normalized,
    type,
    ts: Date.now(),
    data: { ...data },
    level,
  };
}

/**
 * Normalize session id for storage and comparison (trim, no secrets).
 */
export function normalizeSessionId(sessionId: string): string {
  if (typeof sessionId !== "string") return "";
  return sessionId.trim();
}

/**
 * Validate session id format; throws if invalid.
 */
export function validateSessionId(sessionId: string): void {
  const s = normalizeSessionId(sessionId);
  if (!s) throw new Error("sessionId is required");
  if (s.length > MAX_SESSION_ID_LENGTH) throw new Error("sessionId too long");
  if (!SESSION_ID_REGEX.test(s)) throw new Error("sessionId contains invalid characters");
}

/**
 * Check if payment journey observability is enabled via env.
 */
export function isPaymentJourneyEnabled(): boolean {
  const v = process.env.PAYMENT_JOURNEY_ENABLED;
  if (v === undefined || v === "") return true;
  return v === "true" || v === "1";
}
