# Changelog

All notable changes to this project will be documented in this file.

The format follows a simplified version of Keep a Changelog, and the project adheres to semantic versioning where applicable.

---

## [v0.3.0-mvp] — 2026-01-31

### 🛡️ Production-Lite Hardening
- **Polling Lock**: Implemented `acquireLock`/`releaseLock` in `PaymentMonitor` to prevent concurrent execution across multiple instances.
- **New MonitorOptions**: Added `pollIntervalMs`, `horizonTimeoutMs`, `lockTtlMs`, and `instanceId` for fine-grained control.
- **Documentation**: Added "Production-Lite Hardening" section to README.

### 🧪 Testing
- Added concurrency and locking tests for `PaymentMonitor`.

## [v0.2.0-mvp] — 2026-01-25

### 🚀 Hardening
- **PersistenceAdapter**: Abstracted persistence layer (defaulting to SQLite) to support future database backends.
- **Rate Limiting**: Added `RateLimiter` (Token Bucket) to `PaymentMonitor` registration to prevent abuse.
- **TTL Cleanup**: Implemented automatic cleanup of expired payment intents and stale locks.
- **Error Handling**: Introduced `RateLimitError` for better API feedback.

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
