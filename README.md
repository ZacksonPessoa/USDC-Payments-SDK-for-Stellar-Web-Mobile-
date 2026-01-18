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
- **`PaymentMonitor`** - Secure Server-Side Payment Verification (NEW!)
- **Wallet Integration** - Built-in Freighter wallet adapter
- **TypeScript Support** - Full type safety and IntelliSense
- **Multi-Asset Support** - XLM, USDC, and custom Stellar assets
- **Testnet Ready** - Complete testnet integration with examples

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
});

// Register an expected payment (Intent)
monitor.registerPayment("ORDER_123", {
  amount: 50,
  assetCode: "USDC",
  destination: "YOUR_MERCHANT_ADDRESS"
});

// Start monitoring the blockchain
monitor.start();
```

The monitor will poll the blockchain, detect the transaction with Memo `ORDER_123`, verify the amount/asset, and send a signed webhook to your URL.

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

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
