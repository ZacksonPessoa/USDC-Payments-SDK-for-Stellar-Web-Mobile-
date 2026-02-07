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
const MAX_DATA_SIZE_BYTES = 10 * 1024; // 10KB limit

// Sensitive keys to redact (case-insensitive matches)
const SENSITIVE_KEYS_REGEX = /^(secret|token|key|auth|authorization|password|cookie|signature|x-api-key|set-cookie|apikey)$/i;
// Stellar secret key format: S... (56 chars)
const STELLAR_SECRET_REGEX = /^S[A-Z0-9]{55}$/;

/**
 * Check if payment journey observability is enabled via env.
 */
export function isPaymentJourneyEnabled(): boolean {
  const v = process.env.PAYMENT_JOURNEY_ENABLED;
  if (v === undefined || v === "") return true;
  return v === "true" || v === "1";
}

/**
 * Redact sensitive data from the event payload.
 */
export function redactJourneyData(data: PaymentEventData, depth = 0): PaymentEventData {
  if (depth > 5) return { _pruned: "Max depth reached" };

  const copy: PaymentEventData = {};

  for (const [key, val] of Object.entries(data)) {
    // 1. Redact by key name
    if (SENSITIVE_KEYS_REGEX.test(key)) {
      copy[key] = "[REDACTED]";
      continue;
    }

    // 2. Redact by value pattern (Stellar Secret Key)
    if (typeof val === "string") {
      if (STELLAR_SECRET_REGEX.test(val)) {
        copy[key] = "[REDACTED_SECRET]";
        continue;
      }
      // Truncate long strings
      if (val.length > 2048) {
        copy[key] = val.slice(0, 2048) + "...[TRUNCATED]";
        continue;
      }
      copy[key] = val;
    } else if (Array.isArray(val)) {
      copy[key] = val.map(v => {
        if (typeof v === 'object' && v !== null) {
          return redactJourneyData(v as PaymentEventData, depth + 1);
        }
        return v;
      });
    } else if (typeof val === "object" && val !== null) {
      copy[key] = redactJourneyData(val as PaymentEventData, depth + 1);
    } else {
      copy[key] = val;
    }
  }
  return copy;
}

/**
 * Enforce strict session ID format: sanitize invalid chars, truncate length.
 */
export function enforceSessionId(sessionId: string): string {
  let s = normalizeSessionId(sessionId);
  // Remove any character that is not alphanumeric, underscore, or hyphen
  s = s.replace(/[^a-zA-Z0-9_-]/g, "");

  if (s.length > MAX_SESSION_ID_LENGTH) {
    s = s.slice(0, MAX_SESSION_ID_LENGTH);
  }

  if (!s) {
    // Return a safe fallback to avoid breaking flow, but indicates error
    return "invalid_session_id";
  }
  return s;
}

/**
 * Create a payment journey event with a unique id and timestamp.
 * Includes security checks: redaction, sanitization, size limits.
 */
export function createEvent(
  sessionId: string,
  type: PaymentEventType,
  data: PaymentEventData = {},
  level: PaymentEventLevel = "info"
): PaymentEvent {
  const safeSessionId = enforceSessionId(sessionId);
  const redactedData = redactJourneyData(data);

  // Check size limit
  let finalData = redactedData;
  try {
    const size = JSON.stringify(redactedData).length;
    if (size > MAX_DATA_SIZE_BYTES) {
      finalData = {
        error: "Payload too large",
        _originalSize: size,
        _truncated: true
      };
    }
  } catch (e) {
    // Circular reference or other error
    finalData = { error: "Serialization failed" };
  }

  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    sessionId: safeSessionId,
    type,
    ts: Date.now(),
    data: finalData,
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
 * Used by API endpoints where strict validation is required.
 */
export function validateSessionId(sessionId: string): void {
  const s = normalizeSessionId(sessionId);
  if (!s) throw new Error("sessionId is required");
  if (s.length > MAX_SESSION_ID_LENGTH) throw new Error("sessionId too long");
  if (!SESSION_ID_REGEX.test(s)) throw new Error("sessionId contains invalid characters");
}
