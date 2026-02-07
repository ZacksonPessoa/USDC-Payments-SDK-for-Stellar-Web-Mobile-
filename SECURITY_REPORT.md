# Security Audit Report - Payment Journey Observability

**Target:** `src/journey/**` and `src/server/**`
**Auditor:** Jules
**Date:** 2024-05-24

## Executive Summary
The newly added "Payment Journey" observability feature introduces several security risks, primarily related to potential sensitive data exposure, log injection, and denial of service via large payloads. While the core payment flow remains functional, the observability layer lacks sufficient input validation and sanitization.

## Findings

### 1. Sensitive Data Exposure (Critical)
**Location:** `src/journey/events.ts` (createEvent)
**Issue:** The `createEvent` function accepts arbitrary `PaymentEventData` without redaction. If a developer accidentally passes an object containing secrets (e.g., `secret`, `apiKey`, `authorization`, `cookie`, `signature`), these secrets will be serialized and stored in the database.
**Exploit Scenario:** A developer logs a failed transaction object that includes the signing key or an API key.
**Recommendation:** Implement a centralized `redactJourneyData` function that recursively scrubs sensitive keys and values (e.g., matching Stellar secret key patterns).

### 2. Log Injection / Event Forgery (High)
**Location:** `src/journey/events.ts` (createEvent)
**Issue:** `createEvent` does not enforce `validateSessionId`. It only calls `normalizeSessionId` (trim). An attacker or a bug could inject invalid session IDs (e.g., containing path traversal characters or control characters) which might disrupt logs or downstream processing.
**Exploit Scenario:** A malicious client sends a request with a crafted session ID, polluting the event stream.
**Recommendation:** Enforce strict session ID validation in `createEvent`. Sanitize invalid characters instead of throwing (to preserve payment flow).

### 3. Denial of Service / Storage Bloat (Medium)
**Location:** `src/journey/events.ts` and `src/server/db.ts`
**Issue:** There are no size limits on the `data` payload of an event. A malicious actor could trigger events with massive payloads (e.g., 10MB strings), causing database bloat, memory pressure, and slow queries.
**Exploit Scenario:** Repeatedly triggering events with large `memo` or custom data fields.
**Recommendation:** Enforce a maximum size limit (e.g., 10KB) for event data. Truncate payloads that exceed this limit.

### 4. Persistence Correctness (Low)
**Location:** `src/server/db.ts`
**Issue:** The unique index `(session_id, type, tx_hash, ts_bucket)` relies on a 1-minute bucket (`ts_bucket`).
**Risk:** Rapid retries of the same event type within the same minute (with the same `txHash` or empty) will be deduplicated. This might hide the frequency of failures.
**Recommendation:** Accept this trade-off for "production-lite" observability but document it clearly. The impact is minimal as the first failure is captured.

## Fix Implementation
The accompanying PR addresses these issues by:
1.  Adding `redactJourneyData` to scrub secrets.
2.  Enforcing strict `sessionId` validation and sanitization.
3.  Implementing a 10KB size limit on event data.
4.  Ensuring `emitJourneyEvent` swallows errors to protect the critical path.
5.  Optimizing the `PAYMENT_JOURNEY_ENABLED` check.
