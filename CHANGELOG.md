# Changelog

All notable changes to this project will be documented in this file.

The format follows a simplified version of Keep a Changelog, and the project adheres to semantic versioning where applicable.

---

## [v0.3.0-mvp] — 2026-01-20

### 🛡️ Production-Lite Hardening
- **Polling Lock:** Implemented concurrency control for `PaymentMonitor` to prevent race conditions in multi-instance deployments.
- **Lock TTL:** Added configurable `lockTtlMs` to auto-expire locks if an instance crashes.
- **Monitor Options:** Added `pollIntervalMs`, `horizonTimeoutMs`, `lockTtlMs`, and `instanceId` to `PaymentMonitor` configuration.
- **Persistence:** Enhanced `PersistenceAdapter` interface with `acquireLock` and `releaseLock` methods.

## [v0.2.0-mvp] — 2026-01-19

### 🔒 Security & Hardening
- **SQLite Persistence:** `PaymentMonitor` now uses SQLite by default to persist state across restarts.
- **Rate Limiting:** Added `RateLimiter` to restrict payment session registration frequency.
- **TTL Cleanup:** Implemented automatic cleanup of expired payments and locks.
- **Error Handling:** Introduced `RateLimitError` and improved error reporting.
- **Persistence Adapter:** Refactored persistence logic into a pluggable `PersistenceAdapter` interface.

## [v0.1.0-mvp] — 2026-01-18

### 🚀 Added
- Initial **secure MVP release** of the USDC Payments SDK for Stellar.
- Server-side payment verification via Stellar Horizon.
- `PaymentMonitor` for backend payment confirmation.
- HMAC-SHA256 signed, server-to-server webhooks.
- SECURITY.md documenting the MVP security model.
- Release versioning and security badges in README.

### 🔐 Security
- Removed all client-side payment confirmation logic.
- Enforced destination address validation.
- Enforced asset code and issuer validation (e.g., USDC).
- Enforced amount validation (`received >= requested`).
- Implemented idempotency to prevent duplicate confirmations.
- Added automatic expiration of pending payment intents (default: 15 minutes).

### ⚠️ Notes
- Horizon polling is used for payment monitoring (acceptable for MVP).
- Idempotency storage may be in-memory depending on deployment.
- This release is intended for pilots and early adopters, not large-scale production.
