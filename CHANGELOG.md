# Changelog

All notable changes to this project will be documented in this file.

The format follows a simplified version of Keep a Changelog, and the project adheres to semantic versioning where applicable.

---

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
