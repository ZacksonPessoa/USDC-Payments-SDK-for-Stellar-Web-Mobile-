[![Release](https://img.shields.io/badge/release-v0.3.4--mvp-blue)](https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-/releases/tag/v0.3.4-mvp)
[![Security](https://img.shields.io/badge/security-MVP--secure-green)](https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-/security)

# USDC Payments SDK for Stellar (Web + Mobile)

**One-line checkout SDK to make paying with USDC on Stellar as easy as Stripe.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)

**Trademark notice.** Stellar is a trademark of the Stellar Development Foundation. All rights reserved.

**Independence.** This is an independent project, not affiliated with, sponsored or endorsed by the Stellar Development Foundation. See [Credits / Legal](docs/credits-legal.md).

---

## 🚧 Public Beta (Testnet)

**This SDK is currently in Public Beta.**

**Status:** Pilot / Testing (v0.3.4-mvp)
*   **Network:** Stellar Testnet (Primary), Mainnet (Experimental)
*   **Use Case:** Development, Integration Testing, Pilot Programs.

**Not yet intended for large-scale production use.**
We are currently hardening the server-side components ("Production-Lite") and finalizing mobile support.

---

## 🚀 Quick Start / Run the Demo

**Option 1: Fastest way to test (No clone required)**

1. Create a folder and install the SDK from the release tarball:
```bash
mkdir usdc-demo && cd usdc-demo
npm init -y
npm install https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-/releases/download/v0.3.4-mvp/zacksonpessoa-usdc-payments-sdk-0.3.4-mvp.tgz
npm install sqlite3 # Peer dependency for server
```

2. Create a file named `test.mjs` with the following content:
```javascript
import { PaymentMonitor } from "@zacksonpessoa/usdc-payments-sdk/server";

// 1. Configure the monitor
const monitor = new PaymentMonitor("TESTNET", "GACCOUNT...", {
  url: "http://localhost:3000/webhook",
  secret: "secret"
});

// 2. Start monitoring
console.log("Starting Payment Monitor...");
monitor.start();

// 3. Keep alive
setInterval(() => {}, 1000);
```

3. Run it:
```bash
node test.mjs
```

**Option 2: Clone and run the full demo**

```bash
git clone https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-.git
cd USDC-Payments-SDK-for-Stellar-Web-Mobile-
npm install
npm run build
node examples/secure-server-example.mjs
```

### How to report issues
Please report bugs or feature requests using our [GitHub Issues](https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-/issues).
Feedback: [Public Beta Feedback Thread (#11)](https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-/issues/11).

---

## 🧠 How it works

The SDK abstracts the complexity of Stellar payments into a simple flow:

1.  **Payment Session:** Merchant creates a unique `sessionId` (Memo) and registers it with the `PaymentMonitor` (Server).
2.  **Wallet Connection:** User connects their wallet (e.g., Freighter) via the `<PayWithUSDC />` component.
3.  **Submission:** User signs the transaction. The SDK submits it to the Stellar Network (Horizon).
4.  **Verification:** The `PaymentMonitor` (Server) detects the transaction on-chain, validates the amount/asset, and marks it as confirmed.
5.  **Finalization:** The Server sends a signed webhook to your backend to fulfill the order.

---

## ✨ Features

- **`<PayWithUSDC />`** - Drop-in React component for instant checkout
- **`createPaymentSession()`** - Build Stellar payment transactions
- **`signAndSubmit()`** - Sign and submit transactions to Horizon
- **`PaymentMonitor`** - Secure Server-Side Payment Verification with SQLite Persistence
- **Rate Limiting** - Built-in protection for payment session registration
- **Production-Lite Mode** - Polling locks for multi-instance safety
- **`PaymentStatusTracker`** - Track payment status through the entire flow
- **`SEP24Helper`** - SEP-24 on/off-ramp integration helpers
- **Retry Logic** - Automatic retry with exponential backoff
- **Wallet Integration** - Built-in Freighter wallet adapter
- **TypeScript Support** - Full type safety and IntelliSense
- **Multi-Asset Support** - XLM, USDC, and custom Stellar assets
- **Network Support** - Both Testnet and Mainnet (PUBLIC) support

---

## 🔍 Observability (Payment Journey)

The SDK includes a powerful **Payment Journey** feature to track and visualize the entire lifecycle of a payment.

*   **Events:** `SESSION_CREATED` -> `TX_SUBMITTED` -> `TX_SEEN_ON_NETWORK` -> `TX_CONFIRMED` -> `WEBHOOK_SENT`.
*   **Storage:** Events are stored in the SQLite database alongside payment records.
*   **Stream:** Supports Server-Sent Events (SSE) for real-time frontend updates.

See [docs/payment-journey.md](docs/payment-journey.md) for setup instructions.

---

## 🔒 Security Model (MVP)

This SDK follows a **server-side trust model**.

The client (web or mobile) is **never trusted** to confirm payments.
All payment confirmations are performed **server-side**, based on **on-chain verification** by monitoring the Stellar network (Horizon).

### Production Checklist
Before going live, ensure you have:
- [ ] **Environment Variables:** Set `HORIZON_URL`, `NETWORK_PASSPHRASE`, and `WEBHOOK_SECRET` securely.
- [ ] **Idempotency:** The `PaymentMonitor` handles this, but ensure your webhook handler is also idempotent.
- [ ] **Webhook Verification:** **Always** verify the `X-Signature` header in your webhook handler.
- [ ] **Persistence:** Ensure the `sqlite3` database file is on a persistent volume (or implement the Postgres adapter).
- [ ] **HTTPS:** Ensure your webhook endpoint is HTTPS.

For a complete security description and vulnerability reporting guidelines, see [`SECURITY.md`](./SECURITY.md).

---

## 🔄 Payment Flow

The payment lifecycle consists of two distinct phases: **Submission** (Client) and **Confirmation** (Server).

1.  **Intent Creation (Server/Client):** The merchant creates a payment intent (e.g., "Order 123" for 50 USDC).
2.  **Registration (Server):** The merchant backend registers this intent with the `PaymentMonitor`.
3.  **Submission (Client):**
    *   The user clicks "Pay" in the `<PayWithUSDC />` component.
    *   The wallet signs the transaction.
    *   The transaction is submitted to the Stellar network.
    *   *Note: `onSuccess` here only means "Submitted".*
4.  **Verification (Server):**
    *   The `PaymentMonitor` polls the blockchain (Horizon).
    *   It detects the incoming transaction to the merchant's wallet.
    *   It matches the transaction Memo to the Session ID.
    *   It validates the amount, asset, and destination.
5.  **Confirmation (Server):**
    *   The `PaymentMonitor` marks the payment as confirmed in SQLite.
    *   It sends a signed webhook to the merchant's backend to fulfill the order.

---

## 🚀 Usage Guide

### Browser vs Server Usage

The SDK exports separate entry points for client-side and server-side usage to minimize bundle size.

**Browser (Client-Side):**
Use this for React components, wallet adapters, and transaction submission.
```typescript
import { PayWithUSDC, FreighterWallet } from "@zacksonpessoa/usdc-payments-sdk";
```

**Server (Node.js):**
Use this for `PaymentMonitor`, webhook verification, and persistence.
```typescript
import { PaymentMonitor, verifySignature } from "@zacksonpessoa/usdc-payments-sdk/server";
```

**Peer Dependencies:**

*   **Client-Side:** If using `PayWithUSDC`, ensure you have React 19+:
    ```bash
    npm install react@^19.0.0 react-dom@^19.0.0
    ```
*   **Server-Side:** If using `PaymentMonitor`, you **must** install `sqlite3` manually (it is an optional peer dependency):
    ```bash
    npm install sqlite3
    ```

### 1. Frontend: Collect Payment

Use the `PayWithUSDC` component to initiate payment in your app.

```tsx
import React from 'react';
import { PayWithUSDC, FreighterWallet } from '@zacksonpessoa/usdc-payments-sdk';

function Checkout() {
  const wallet = new FreighterWallet();

  return (
    <PayWithUSDC
      amount={50}
      destination="GDESTINATIONADDRESS..."
      assetCode="USDC"
      issuer="GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL"
      memo="ORDER_123" // Important for tracking!
      wallet={wallet}
      onSuccess={(hash) => console.log('Payment submitted (wait for confirmation):', hash)}
      onError={(error) => console.error('Payment failed:', error)}
      onStatusChange={(status) => console.log('Payment status:', status)}
    />
  );
}
```

### 2. Backend: Verify Payment & Webhooks (Secure)

**Critical:** Do not rely on frontend callbacks for confirmation. Use the Server-Side `PaymentMonitor`.

```typescript
import { PaymentMonitor } from '@zacksonpessoa/usdc-payments-sdk/server';

// Initialize the monitor on your backend
// A local SQLite DB (usdc_payments.db) will be created for persistence.
const monitor = new PaymentMonitor("TESTNET", "YOUR_MERCHANT_ADDRESS", {
  url: "https://api.yoursite.com/webhooks/payment", // Internal or external webhook
  secret: "YOUR_WEBHOOK_SECRET_KEY" // Used for HMAC-SHA256 signing
}, {
  timeoutMinutes: 15 // Stop monitoring payment after 15 minutes
});

// Register an expected payment (Intent)
monitor.registerPayment("ORDER_123", {
  amount: 50,
  assetCode: "USDC",
  issuer: "GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL", // Required for USDC
  destination: "YOUR_MERCHANT_ADDRESS"
});

// Start monitoring the blockchain
monitor.start();
```

### 3. Verify Webhook Signature

Your webhook endpoint must verify the `X-Signature` header to ensure the request is genuine.

```typescript
import { verifySignature } from '@zacksonpessoa/usdc-payments-sdk/server';

app.post('/webhooks/payment', (req, res) => {
  const signature = req.headers['x-signature'];
  const payload = JSON.stringify(req.body);
  const secret = "YOUR_WEBHOOK_SECRET_KEY";

  if (!verifySignature(payload, signature, secret)) {
    return res.status(401).send("Invalid Signature");
  }

  // Process payment confirmation safely...
  console.log("Payment Confirmed:", req.body);
  res.send("OK");
});
```

---

## 🛡️ Production-Lite Hardening (v0.3.4)

For "production-lite" environments (e.g., 2 load-balanced instances), the `PaymentMonitor` now includes built-in concurrency controls.

### Concurrency & Locking
The SDK implements a **polling lock** using the persistence adapter (SQLite by default).
*   **Prevent Concurrent Execution:** Only one `PaymentMonitor` instance will poll the blockchain at a time.
*   **Self-Healing:** If an instance crashes while holding the lock, it will automatically expire (TTL) so other instances can take over.
*   **Active/Passive:** In a multi-instance deployment, instances compete for the lock. One becomes active, others wait.

### Deployment Recommendations
*   **Single Instance:** Works out of the box. No configuration needed.
*   **Multi-Instance (2+):**
    *   Ensure all instances share the same filesystem (for SQLite) OR implement a custom `PersistenceAdapter` backed by an external DB (Postgres/Redis).
    *   Set `instanceId` to a unique value for debugging (optional, defaults to UUID).

### Migration Path
To scale beyond "lite" usage (SQLite on shared disk), implement the `PersistenceAdapter` interface to use an external database like PostgreSQL. The locking logic (`acquireLock`/`releaseLock`) is already defined in the interface to support this transition seamlessly.

---

## 📦 API Reference

### PayWithUSDC Component

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `amount` | `number` | ✅ | Payment amount (must be > 0) |
| `destination` | `string` | ✅ | Destination Stellar address (56 chars, starts with G) |
| `wallet` | `WalletAdapter` | ✅ | Wallet implementation (e.g., FreighterWallet) |
| `assetCode` | `string` | ❌ | Asset code (default: "XLM") |
| `issuer` | `string` | ❌ | Asset issuer (required for non-native assets like USDC) |
| `memo` | `string` | ❌ | Transaction memo (ID) - Important for payment tracking |
| `network` | `"TESTNET" \| "PUBLIC"` | ❌ | Network (default: "TESTNET") |
| `source` | `string` | ❌ | Source address (optional, uses wallet if not provided) |
| `label` | `string` | ❌ | Button label (default: "Pay") |
| `onSuccess` | `(hash: string) => void` | ❌ | Success callback (UI only - transaction submitted) |
| `onError` | `(error: unknown) => void` | ❌ | Error callback |
| `onStatusChange` | `(status: string) => void` | ❌ | Status change callback (NEW!) - Tracks payment flow: "creating", "signing", "submitting", "submitted", "failed" |

> ⚠️ **Important – Payment Confirmation**
>
> The `onSuccess` callback indicates that the transaction was **successfully signed and submitted** to the Stellar network.
> It does **not** mean the payment is confirmed or settled.
>
> Payment confirmation is performed **exclusively server-side**, based on **on-chain verification** by monitoring the Stellar network (Horizon).

### Server Modules (`@zacksonpessoa/usdc-payments-sdk/server`)

#### `PaymentMonitor`
Monitors an account for specific incoming payments, with built-in SQLite persistence.

**Requirement:** Requires `sqlite3` installed in your project.

**Constructor:**
`new PaymentMonitor(network, monitoredAccount, webhookConfig, options)`

**Options (`MonitorOptions`):**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeoutMinutes` | `number` | `15` | Expiration time for pending payments |
| `pollIntervalMs` | `number` | `5000` | Polling interval in milliseconds |
| `horizonTimeoutMs` | `number` | `15000` | Horizon request timeout |
| `lockTtlMs` | `number` | `20000` | Lock TTL for concurrency control |
| `instanceId` | `string` | `UUID` | Unique ID for this monitor instance |
| `adapter` | `PersistenceAdapter` | `Database` | Custom persistence adapter |
| `journeyStore` | `JourneyStorageAdapter` | `undefined` | Optional: payment journey event store for observability |
| `rateLimit` | `RateLimitConfig` | `{windowMs: 60000, max: 100}` | Rate limit configuration |

#### `generateSignature(payload, secret)` / `verifySignature(payload, signature, secret)`
Crypto helpers for secure webhook communication.

---

## 🧪 Examples

### Secure Server Example

See [examples/secure-server-example.mjs](examples/secure-server-example.mjs) for a complete simulation of the payment flow including server-side verification and persistence.

```bash
npm run build
node examples/secure-server-example.mjs
```

---

## 🔧 Configuration

### Build Configuration

The SDK builds to:
- **Client:** `dist/index.js` (Browser/React)
- **Server:** `dist/server/index.js` (Node.js)

---

## 🛣️ Roadmap & Milestones (SCF Build)

We are applying for the Stellar Community Fund (SCF) Build Award to bring this SDK to production.

### Milestone 1: Mobile Support (Weeks 1-4)
*   **Goal:** Enable native mobile apps to accept USDC payments.
*   **Deliverables:** React Native SDK, Mobile Wallet Adapter, Expo Demo App.

### Milestone 2: Mainnet Readiness (Weeks 5-8)
*   **Goal:** Ensure robustness for real-money transactions.
*   **Deliverables:** Postgres/Redis Adapter, Recovery Tools, Failure Mode Analysis.

### Milestone 3: Developer Adoption (Weeks 9-12)
*   **Goal:** Lower barrier to entry.
*   **Deliverables:** Documentation Refresh, Docker Reference Deployments, Production Checklist.

---

## 📊 Project Status

### ✅ Phase 1 - Core SDK (COMPLETE)

- [x] **Core SDK with React component** - `<PayWithUSDC />` component fully functional
- [x] **Transaction builder** - `createPaymentSession()` creates Stellar payment transactions
- [x] **Transaction submitter** - `signAndSubmit()` signs and submits to Horizon
- [x] **Freighter wallet integration** - Built-in adapter for browser extension
- [x] **TypeScript support** - Full type safety and IntelliSense
- [x] **Testnet integration** - Complete testnet support with examples
- [x] **Next.js example app** - Working demo application
- [x] **Server-side payment monitoring** - `PaymentMonitor` for secure verification
- [x] **Secure webhooks** - Server-side webhook system with HMAC-SHA256 signatures

### ✅ Phase 2 - Advanced Features (COMPLETE)

- [x] **Backend webhook support** ✅ - Server-side webhooks implemented
- [x] **SQLite Persistence** ✅ - `PaymentMonitor` persists state to `usdc_payments.db`
- [x] **SEP-24 on/off-ramp helpers** ✅ - Basic SEP-24 integration helpers implemented
- [x] **Payment confirmation flows** ✅ - PaymentStatusTracker and status tracking implemented
- [x] **Error handling improvements** ✅ - Custom error classes and improved error handling
- [x] **Retry logic** ✅ - Automatic retry with exponential backoff for transactions
- [x] **Unit tests** ✅ - Test suite configured with Vitest
- [x] **PaymentMonitor tests** ✅ - Tests for PaymentMonitor and WebhookSender implemented

### 📈 Releases / Hardening Track

- **v0.2.0-mvp**: MVP Hardening
    - [x] Rate limiting
    - [x] TTL cleanup
    - [x] SQLite PersistenceAdapter (default)
    - [x] RateLimitError

- **v0.3.0-mvp**: Production-Lite
    - [x] Polling lock (concurrency control)
    - [x] Multi-instance safety (SQLite/DB backed)
    - [x] Configurable polling & lock TTL

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

**Trademarks & independence:** [Credits / Legal](docs/credits-legal.md).
