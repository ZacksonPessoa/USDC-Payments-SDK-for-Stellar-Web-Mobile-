[![Release](https://img.shields.io/badge/release-v0.1.0--mvp-blue)](https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-/releases/tag/v0.1.0-mvp)
[![Security](https://img.shields.io/badge/security-MVP--secure-green)](https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-/security)



# USDC Payments SDK for Stellar (Web + Mobile)

**One-line checkout SDK to make paying with USDC on Stellar as easy as Stripe.**

[![npm version](https://badge.fury.io/js/%40zacksonpessoa%2Fusdc-payments-sdk.svg)](https://badge.fury.io/js/%40zacksonpessoa%2Fusdc-payments-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)

---

## ✨ Features

- **`<PayWithUSDC />`** - Drop-in React component for instant checkout
- **`createPaymentSession()`** - Build Stellar payment transactions
- **`signAndSubmit()`** - Sign and submit transactions to Horizon
- **`PaymentMonitor`** - Secure Server-Side Payment Verification
- **`PaymentStatusTracker`** - Track payment status through the entire flow (NEW!)
- **`SEP24Helper`** - SEP-24 on/off-ramp integration helpers (NEW!)
- **Custom Error Classes** - Detailed error handling with specific error types (NEW!)
- **Retry Logic** - Automatic retry with exponential backoff (NEW!)
- **Wallet Integration** - Built-in Freighter wallet adapter
- **TypeScript Support** - Full type safety and IntelliSense
- **Multi-Asset Support** - XLM, USDC, and custom Stellar assets
- **Network Support** - Both Testnet and Mainnet (PUBLIC) support
- **Unit Tests** - Test suite with Vitest (NEW!)

---

## 🔒 Security Model (MVP)

This SDK follows a **server-side trust model**.

The client (web or mobile) is **never trusted** to confirm payments.

All payment confirmations are performed **server-side**, based on **on-chain verification** by monitoring the Stellar network (Horizon).

### Enforced Guarantees (v0.1.0-mvp)
- Client-side payment confirmations are not accepted
- Payments are confirmed only after on-chain verification
- Destination address, asset code, and asset issuer are validated
- Received amount must be greater than or equal to the requested amount
- Idempotency prevents duplicate confirmations
- Pending payment intents expire automatically (default: 15 minutes)
- Merchant webhooks are sent server-to-server and signed with HMAC-SHA256

For a complete security description and vulnerability reporting guidelines, see [`SECURITY.md`](./SECURITY.md).


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
      onSuccess={(hash) => console.log('Payment sent:', hash)}
      onError={(error) => console.error('Payment failed:', error)}
    />
  );
}
```

### 2. Backend: Verify Payment & Webhooks (Secure)

**Critical:** Do not rely on frontend callbacks for confirmation. Use the Server-Side `PaymentMonitor`.

```typescript
import { PaymentMonitor } from '@zacksonpessoa/usdc-payments-sdk/server';

// Initialize the monitor on your backend
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

The monitor performs strict validations before confirming:
1.  **Idempotency:** Ensures payments are confirmed only once per session ID.
2.  **Destination:** Verifies funds arrived at the monitored account.
3.  **Asset & Issuer:** Strictly checks `asset_code` and `asset_issuer` match the intent.
4.  **Amount:** Verifies received amount is greater than or equal to requested amount.
5.  **Timeout:** Automatically expires pending payments after the configured timeout (default: 15m).

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

## 🔒 Security Improvements (Feb 2025)

This SDK has been updated to remove client-side webhooks.
- **Removed:** `WebhookManager` in the client (browser).
- **Added:** `PaymentMonitor` for Node.js (Server).
- **Added:** HMAC-SHA256 signature verification.
- **Added:** Server-side hardening (Amount/Asset/Destination validation).

**Why?** Client-side webhooks can be spoofed by malicious users. Confirmation must always happen on a trusted server by observing the blockchain directly.

---

## 📦 API Reference

### PayWithUSDC Component

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `amount` | `number` | ✅ | Payment amount |
| `destination` | `string` | ✅ | Destination Stellar address |
| `wallet` | `WalletAdapter` | ✅ | Wallet implementation |
| `assetCode` | `string` | ❌ | Asset code (default: "XLM") |
| `issuer` | `string` | ❌ | Asset issuer (required for non-native assets) |
| `memo` | `string` | ❌ | Transaction memo (ID) |
| `network` | `"TESTNET" \| "PUBLIC"` | ❌ | Network (default: "TESTNET") |
| `source` | `string` | ❌ | Source address (optional) |
| `label` | `string` | ❌ | Button label (default: "Pay") |
| `onSuccess` | `(hash: string) => void` | ❌ | Success callback (UI only) |
| `onError` | `(error: unknown) => void` | ❌ | Error callback |

> ⚠️ **Important – Payment Confirmation**
>
> The `onSuccess` callback indicates that the transaction was **successfully signed and submitted** to the Stellar network.
> It does **not** mean the payment is confirmed or settled.
>
> Payment confirmation is performed **exclusively server-side**, based on **on-chain verification** by monitoring the Stellar network (Horizon).
>
> Merchants must rely on the backend verification flow (e.g. `PaymentMonitor` + webhooks) to determine when a payment is actually confirmed.


### Server Modules (`@zacksonpessoa/usdc-payments-sdk/server`)

#### `PaymentMonitor`
Monitors an account for specific incoming payments.

#### `generateSignature(payload, secret)` / `verifySignature(payload, signature, secret)`
Crypto helpers for secure webhook communication.

---

## 🧪 Examples

### Secure Server Example

See [examples/secure-server-example.mjs](examples/secure-server-example.mjs) for a complete simulation of the payment flow.

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
- [x] **Crypto helpers** - `generateSignature()` and `verifySignature()` functions

### ✅ Phase 2 - Advanced Features (COMPLETE)

- [x] **Backend webhook support** ✅ - Server-side webhooks implemented
- [x] **SEP-24 on/off-ramp helpers** ✅ - Basic SEP-24 integration helpers implemented
- [x] **Payment confirmation flows** ✅ - PaymentStatusTracker and status tracking implemented
- [x] **Error handling improvements** ✅ - Custom error classes and improved error handling
- [x] **Retry logic** ✅ - Automatic retry with exponential backoff for transactions
- [x] **Unit tests** ✅ - Test suite configured with Vitest (all 36 tests passing)
- [x] **PaymentMonitor tests** ✅ - Tests for PaymentMonitor and WebhookSender implemented
- [x] **PaymentMonitor error handling** ✅ - Improved error handling with custom error classes
- [x] **Test mocking** ✅ - Complete mocks for Stellar SDK (Operation, TransactionBuilder, etc.)

### 📋 Phase 3 - Mobile Support (PLANNED)

- [ ] **React Native SDK** ❌
- [ ] **Mobile wallet adapters** ❌
- [ ] **Cross-platform examples** ❌

### 🎯 Phase 4 - Production Ready (PLANNED)

- [ ] **Mainnet production release** ❌ - Currently testnet only
- [ ] **CI/CD pipeline** ❌ - No automated testing/deployment
- [ ] **Merchant pilot programs** ❌
- [ ] **Performance optimizations** ❌
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
   - Payment monitoring via Horizon API
   - Secure webhook delivery with retries
   - HMAC-SHA256 signature generation/verification
   - Payment validation (amount, asset, issuer, destination)
   - Idempotency protection
   - Automatic expiration of pending payments

### What's Missing

1. **Critical for Production**
   - Unit and integration tests
   - Mainnet support (currently testnet only)
   - CI/CD pipeline
   - Comprehensive error handling

2. **Feature Gaps**
   - React Native support
   - Additional wallet adapters (beyond Freighter)
   - More comprehensive SEP-24 integration (currently basic helpers)
   - Enhanced payment confirmation UI flows

3. **Deprecated/Removed**
   - Client-side `WebhookManager` (removed for security)
   - Client-side `WebhookClient` (removed for security)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
