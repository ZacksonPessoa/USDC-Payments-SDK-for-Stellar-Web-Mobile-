# SCF Application: USDC Payments SDK for Stellar (Web + Mobile)

**Project Title:** USDC Payments SDK for Stellar (Web + Mobile)

**One-Liner:** A developer-friendly, "Stripe-like" SDK for integrating USDC payments on Stellar, featuring a one-line checkout component and secure server-side verification.

---

## 1. Problem
Integrating USDC payments on Stellar remains **too complex** for the average developer. Building a secure payment flow requires deep knowledge of:
- SEPs (Stellar Ecosystem Proposals)
- Wallet connection and signing (Freighter, Albedo, etc.)
- Horizon API interaction and error handling
- **Crucially:** Secure server-side payment verification (to avoid "fake" client-side confirmations)

This complexity creates a high barrier to entry, slowing down the adoption of USDC for e-commerce, SaaS, and real-world payments.

## 2. Solution
We provide a **universal Payments SDK** that abstracts the entire payment lifecycle into simple, high-level primitives:

*   **Client-Side (React/JS):** A drop-in `<PayWithUSDC />` component that handles wallet connection (Freighter), transaction building, and submission.
*   **Server-Side (Node.js):** A robust `PaymentMonitor` that tracks the blockchain for payments, handles idempotency, and sends signed webhooks to the merchant's backend.
*   **Observability:** Built-in "Payment Journey" tracking to visualize the entire flow from intent to final settlement.

## 3. Why Stellar?
Stellar is the ideal network for USDC payments due to:
- **Speed:** 3-5 second finality.
- **Cost:** Fraction of a cent per transaction.
- **Native Asset Support:** USDC is a first-class citizen on the network.
- **Path Payments:** Users can pay with any asset, and merchants receive USDC.

## 4. Current Traction (Phase 2 Complete)
The project is currently in **Public Beta (v0.3.x)** with a focus on reliability and developer experience.

**Completed Features:**
- ✅ **Core SDK:** `createPaymentSession`, `signAndSubmit`, `<PayWithUSDC />`.
- ✅ **Secure Verification:** Server-side `PaymentMonitor` with SQLite persistence.
- ✅ **Observability:** "Payment Journey" event sourcing (Session Created → Tx Submitted → Confirmed).
- ✅ **Production-Lite:** Concurrency controls (polling locks), rate limiting, and extensive error handling.
- ✅ **Documentation:** Interactive examples and comprehensive guides.

## 5. Architecture Overview

The system follows a **Trust-No-One (Client)** architecture. The client is responsible only for *submission*; the server is responsible for *confirmation*.

1.  **Client SDK:** User clicks "Pay", wallet signs, SDK submits to Horizon.
2.  **Stellar Network:** Transaction is validated and included in a ledger.
3.  **PaymentMonitor (Server):** Polls Horizon, detects the transaction, verifies amounts/memos.
4.  **Persistence (SQLite):** Stores payment state and prevents double-processing.
5.  **Webhook:** Server sends a signed (HMAC) webhook to the merchant's backend to fulfill the order.

## 6. Milestones (Proposed for SCF Build)

We propose a **12-week timeline** to bring the SDK from Public Beta to Production-Ready v1.0.

### Milestone 1: Mobile Support (Weeks 1-4)
**Goal:** Enable native mobile apps to accept USDC payments.
*   **Deliverables:**
    *   React Native SDK package (`@zacksonpessoa/usdc-payments-sdk-native`).
    *   Mobile Wallet Adapter (supporting WalletConnect or deep linking to mobile wallets).
    *   Demo Mobile App (Expo/React Native).
*   **Acceptance Criteria:**
    *   A user can install the React Native package.
    *   A user can connect a mobile wallet (e.g., Lobstr, xBull).
    *   A user can successfully complete a payment flow on Testnet.

### Milestone 2: Mainnet Readiness & Reliability (Weeks 5-8)
**Goal:** Ensure the system is robust enough for real-money transactions.
*   **Deliverables:**
    *   **Recovery Tools:** CLI tools to replay "stuck" webhooks or re-scan blocks.
    *   **External Database Support:** Implement a Postgres/Redis adapter for `PaymentMonitor` (scaling beyond SQLite).
    *   **Failure Mode Analysis:** rigorous testing of network partitions, Horizon downtime, and server crashes.
*   **Acceptance Criteria:**
    *   Monitor automatically recovers from 1-hour Horizon outage.
    *   Support for PostgreSQL persistence layer (via `PersistenceAdapter`).
    *   >99.9% payment detection rate in stress tests.

### Milestone 3: Developer Adoption Pack (Weeks 9-12)
**Goal:** Lower the barrier to entry with copy-pasteable recipes and deployment guides.
*   **Deliverables:**
    *   **Documentation Refresh:** "Zero to Hero" guide, API reference update.
    *   **Reference Deployments:** Docker Compose setup for the Monitoring Server.
    *   **Production Checklist:** Automated script to check env vars and security settings.
*   **Acceptance Criteria:**
    *   New documentation site (or significantly upgraded README).
    *   One-command deployment (Docker) working.
    *   3+ community developer integrations (feedback loop).

## 7. Budget Breakdown
**Total Requested: $XX,XXX (TBD based on standard rates)**

*   **Development (60%):** Core engineering for Mobile SDK, Postgres adapter, and reliability hardening.
*   **Infrastructure & Testing (15%):** CI/CD setup, stress testing environments, cloud hosting for demos.
*   **Security Audit (15%):** Code review and security analysis of the `PaymentMonitor` and signing logic.
*   **Documentation & Community (10%):** Technical writing, tutorials, and developer support.

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Wallet Fragmentation** | Mobile wallets have different signing flows. | Build a flexible `WalletAdapter` interface and support WalletConnect (standard). |
| **Horizon Reliability** | If Horizon goes down, payments are missed. | Implement robust "cursor" tracking to resume exactly where left off; support multiple Horizon providers. |
| **Double Spending** | Malicious users replaying transactions. | Strict idempotency checks in `PaymentMonitor` (store Tx Hash); verify "Memo" uniqueness. |

## 9. Links & Resources

*   **Repository:** [GitHub](https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-)
*   **Latest Release:** [v0.3.4-mvp](https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-/releases/tag/v0.3.4-mvp)
*   **Live Demo (Code):** [examples/secure-server-example.mjs](./examples/secure-server-example.mjs)
*   **Payment Journey Docs:** [docs/payment-journey.md](./docs/payment-journey.md)
