# Security Policy

## Supported Versions
This project is currently in **MVP stage**. Security fixes are provided for the latest `main` branch.

## Security Model (MVP)
This SDK is designed so that **payment confirmation is never trusted from the client (browser/mobile)**.

### Source of Truth
**On-chain verification** is performed server-side by monitoring Stellar (Horizon) before any payment is considered confirmed.

### Webhooks
Webhook notifications to merchants are sent **server-to-server** only, and are **HMAC-SHA256 signed**.

### Minimum Verification Requirements (Enforced)
The backend payment monitor verifies, at minimum:
- `destination` matches the expected recipient address
- `asset_code` matches (e.g., `USDC`)
- `asset_issuer` matches the configured issuer
- `received_amount >= requested_amount`
- **idempotency**: the same transaction/session is not processed more than once
- **timeouts**: pending payment intents expire automatically (default: 15 minutes)

## Merchant Integration Guidance
If you receive webhooks from this SDK, your backend **must**:
1. Verify the HMAC signature for every request.
2. Enforce replay protections (recommended): reject old timestamps and duplicated event IDs if provided.
3. Treat the webhook as a notification, not as sole proof: you may optionally re-check Horizon for defense-in-depth.

## Reporting a Vulnerability
Please report security issues **privately**.

- **Do not** open public GitHub issues for vulnerabilities.
- Prefer GitHub’s private reporting if available:
  - Go to: `Security` → `Advisories` → `Report a vulnerability`
- If private reporting is not enabled, contact the maintainer via a private channel.

When reporting, include:
- A clear description of the issue
- Steps to reproduce (PoC)
- Impact assessment (what an attacker can do)
- Affected files/paths and suggested fixes (if known)

## Disclosure Policy
We aim to acknowledge valid reports and work on a fix as quickly as possible. For MVP stage, timelines may vary, but critical issues will be prioritized.

## Security Notes (MVP Limitations)
- The backend monitor uses Horizon polling (acceptable for MVP). For production scale, streaming and persistent storage are recommended.
- Idempotency storage may be in-memory depending on deployment; for production use, persistent storage is recommended.
