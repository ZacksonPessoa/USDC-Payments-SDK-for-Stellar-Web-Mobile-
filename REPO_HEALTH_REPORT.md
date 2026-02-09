# Repo Health Report (v0.3.1-mvp)

## Overview
This report summarizes the findings of a repo-wide consistency and hygiene review. The codebase is generally coherent, but several improvements were identified to align implementation with documentation and best practices.

## Findings

### 1. Documentation Coherence
- **Consistent**: `README.md` correctly references version `v0.3.1-mvp` and describes the server-side verification model.
- **Inconsistent**: The README states that `WebhookManager` and `WebhookClient` are "Removed", but they are still exported in `src/index.ts`. While the classes themselves log deprecation warnings, their continued export is technically not "removed".
  - **Action**: Add explicit `@deprecated` tags to exports in `src/index.ts` to reflect their status in IDEs and documentation.

### 2. Packaging & Release Readiness
- **Correct**: `package.json` uses `exports` to separate client (`.`) and server (`./server`) builds.
- **Correct**: `sqlite3` is correctly listed as a `peerDependency` and optional, ensuring client-side builds don't fail on native bindings.
- **Correct**: `tsup` configuration correctly splits builds.
- **Note**: `stellar-sdk` dependency is deprecated in favor of `@stellar/stellar-sdk`. While functional, migrating is recommended for future releases (out of scope for this MVP fix).

### 3. Security & Privacy Hygiene
- **Good**: `PaymentMonitor` uses `sqlite3` for persistence and implements polling locks ("production-lite").
- **Good**: `src/journey/events.ts` implements strict redaction for sensitive keys and Stellar secrets.
- **Good**: No secrets or PII were found hardcoded in source files (example secrets are clearly marked).
- **Optimization Needed**: `PaymentMonitor.checkTransactions` iterates over payments and makes an N+1 API call (`record.transaction()`) to fetch the memo for verification. This is necessary because the Horizon `payments` stream cursor is used, but payments don't include memos directly. Switching to `transactions` stream would be more efficient but breaks cursor compatibility for existing deployments.
  - **Action**: Keep current implementation for compatibility but document the trade-off in code.

### 4. Code Quality & Structure
- **Mixed Imports**: `src/core/createPaymentSession.ts` mixes `import * as StellarSDK` with named imports like `import { Keypair } from "stellar-sdk"`.
  - **Action**: Standardize on named imports for consistency and tree-shaking potential.
- **Duplicate Logic**: `src/server/paymentMonitor.ts` has cursor resolution logic in `start()` that can be streamlined.
- **Tests**: `npm test` passes and covers critical paths (`createPaymentSession`, `PaymentMonitor`).

## Recommended Actions (Implemented in this PR)
1.  **Refactor Imports**: Clean up `src/core/createPaymentSession.ts`.
2.  **Deprecate Exports**: explicitly mark `WebhookManager` and `WebhookClient` as deprecated.
3.  **Streamline Monitor**: Simplify cursor logic in `PaymentMonitor.start()` and document the N+1 decision.
