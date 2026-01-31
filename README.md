[![Release](https://img.shields.io/badge/release-v0.3.0--mvp-blue)](https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-/releases/tag/v0.3.0-mvp)
[![Security](https://img.shields.io/badge/security-MVP--secure-green)](https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-/security)

# USDC Payments SDK for Stellar (Web + Mobile)

**One-line checkout SDK to make paying with USDC on Stellar as easy as Stripe.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)

---

## ✨ Features

- **`<PayWithUSDC />`** - Drop-in React component for instant checkout
- **`createPaymentSession()`** - Build Stellar payment transactions
- **`signAndSubmit()`** - Sign and submit transactions to Horizon
- **`PaymentMonitor`** - Secure Server-Side Payment Verification with Persistence Abstraction (SQLite Default)
- **`PaymentStatusTracker`** - Track payment status through the entire flow
- **`SEP24Helper`** - SEP-24 on/off-ramp integration helpers
- **Production-Lite Hardening** - Polling locks for multi-instance deployments (v0.3.0)
- **Rate Limiting** - Token bucket limiting on payment registration (v0.2.0)
- **TTL Cleanup** - Automatic cleanup of expired intents and locks (v0.2.0)
- **Custom Error Classes** - Detailed error handling with specific error types
- **Retry Logic** - Automatic retry with exponential backoff
- **Wallet Integration** - Built-in Freighter wallet adapter
- **TypeScript Support** - Full type safety and IntelliSense
- **Multi-Asset Support** - XLM, USDC, and custom Stellar assets
- **Network Support** - Both Testnet and Mainnet (PUBLIC) support
- **Unit Tests** - Test suite with Vitest (NEW!)

---

## 🚧 Public Beta (Testnet-First)

This SDK is currently in **Public Beta**.
- **Network Support:** Fully functional on Stellar Testnet. Mainnet (Public) support is technically available but recommended for pilot/testing only.
- **Stability:** "Production-Lite" features (locking, persistence) are in place, but comprehensive audits and large-scale load testing are ongoing.
- **Reporting:** Please report bugs or feature requests via GitHub Issues using the provided templates.

### How to Test (Quickstart)
1. Clone the repo.
2. Run the secure server example: `npm run test:webhook`.
3. Use the `PayWithUSDC` component in your React app pointing to your server.

---

## 🔒 Security Model (MVP)

This SDK follows a **server-side trust model**.

The client (web or mobile) is **never trusted** to confirm payments.

All payment confirmations are performed **server-side**, based on **on-chain verification** by monitoring the Stellar network (Horizon).

### Enforced Guarantees (v0.2.0-mvp)
- **Submission != Confirmation:** Client handles submission; Server handles confirmation.
- **On-Chain Verification:** Payments are confirmed only after detecting the transaction on the Stellar ledger.
- **Persistence:** The `PaymentMonitor` uses a local SQLite database (`usdc_payments.db`) to persist state, ensuring no payments are missed during server restarts.
- **Strict Validation:** Destination, Asset, Issuer, and Amount are strictly validated against the registered intent.
- **Idempotency:** Processed transaction hashes are stored to prevent duplicate processing.
- **Expiration:** Pending payment intents expire automatically (default: 15 minutes).
- **Secure Webhooks:** Merchant webhooks are sent server-to-server and signed with HMAC-SHA256.

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

## 🚀 Quick Start

### Installation

```bash
npm install @zacksonpessoa/usdc-payments-sdk
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
  timeoutMinutes: 15,      // Stop monitoring payment after 15 minutes
  pollIntervalMs: 5000,    // Check Horizon every 5s (optional)
  horizonTimeoutMs: 15000, // Horizon request timeout (optional)
  lockTtlMs: 20000,        // Lock expiration for multi-instance (optional)
  instanceId: "inst-1"     // Unique ID for this instance (optional)
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

## 🔒 Security Improvements (v0.2.0-mvp)

This SDK has been updated to strictly separate client and server responsibilities.
- **Client:** Handles only transaction building, signing, and submission.
- **Server:** Handles monitoring, validation, persistence (SQLite), and confirmation webhooks.
- **Persistence:** The `PaymentMonitor` is now robust against server restarts, using a local SQLite database to track processed transactions and the Horizon cursor.

---

## 🛡️ Production-Lite Hardening (v0.3.0)

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
- **Server:** `dist/server.js` (Node.js)

---

## 📊 Project Status

### 🏆 Releases / Hardening Track
- **v0.3.0-mvp**: Production-Lite Hardening (Polling Lock, MonitorOptions).
- **v0.2.0-mvp**: Security Hardening (Rate limiting, PersistenceAdapter, TTL Cleanup).

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

### 📋 Phase 3 - Mobile Support (PLANNED)

- [ ] **React Native SDK** ❌
- [ ] **Mobile wallet adapters** ❌
- [ ] **Cross-platform examples** ❌

### 🎯 Phase 4 - Production Ready (PLANNED)

- [ ] **Mainnet production release** ❌ - Currently testnet only
- [ ] **CI/CD pipeline** ❌ - No automated testing/deployment
- [ ] **Merchant pilot programs** ❌
- [ ] **Comprehensive documentation** ⚠️ - Basic docs exist, needs expansion

---

## 🔍 Current Implementation Details

### What Works

1. **Client-Side (Browser)**
   - React component for payment UI
   - Freighter wallet integration
   - Transaction creation and signing
   - Testnet support

2. **Server-Side (Node.js)**
   - Payment monitoring via Horizon API with **SQLite Persistence**
   - Secure webhook delivery with retries
   - HMAC-SHA256 signature generation/verification
   - Payment validation (amount, asset, issuer, destination)
   - Idempotency protection
   - Automatic expiration of pending payments

### What's Missing

1. **Critical for Production**
   - Mainnet support (currently testnet only)
   - CI/CD pipeline

2. **Feature Gaps**
   - React Native support
   - Additional wallet adapters (beyond Freighter)

3. **Deprecated/Removed**
   - Client-side `WebhookManager` (use `PaymentMonitor`)
   - Client-side `WebhookClient` (use `PaymentMonitor`)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
