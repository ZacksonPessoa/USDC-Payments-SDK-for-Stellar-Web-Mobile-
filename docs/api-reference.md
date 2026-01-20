# API Reference — USDC Payments SDK for Stellar

Complete API reference for the USDC Payments SDK for Stellar (Web + Mobile).

---

## 📦 Package Exports

### Client-Side (Browser)
```typescript
import {
  PayWithUSDC,
  createPaymentSession,
  signAndSubmit,
  FreighterWallet
} from "@zacksonpessoa/usdc-payments-sdk";
```

### Server-Side (Node.js)
```typescript
import {
  PaymentMonitor,
  verifySignature
} from "@zacksonpessoa/usdc-payments-sdk/server";
```

---

## 🧩 Client Components

### `PayWithUSDC`

A React component that handles the UI and logic for signing/submitting payments.

#### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `amount` | `number` | ✅ | Amount to pay |
| `destination` | `string` | ✅ | Merchant's Stellar address |
| `wallet` | `WalletAdapter` | ✅ | Wallet instance (e.g. `FreighterWallet`) |
| `memo` | `string` | ❌ | Transaction Memo (Recommended for tracking) |
| `assetCode` | `string` | ❌ | Asset Code (default "XLM") |
| `issuer` | `string` | ❌ | Asset Issuer (required for non-native) |
| `onSuccess` | `(hash) => void` | ❌ | Called when transaction is **submitted** |
| `onError` | `(err) => void` | ❌ | Called on failure |

---

## 🔧 Core Functions (Client)

### `createPaymentSession(request, sourceKey?)`

Builds a Stellar transaction XDR.

```typescript
const session = await createPaymentSession({
  amount: 50,
  assetCode: "USDC",
  destination: "G...",
  memo: "order_123"
});
// session.xdr contains the unsigned transaction
```

### `signAndSubmit(xdr, secret)`

**Dev/Test Utility.** Signs and submits a transaction using a secret key.
> ⚠️ **Warning:** Do not use this in production frontend code with real secrets. Use `WalletAdapter` instead.

---

## 🛡️ Server Modules

### `PaymentMonitor`

The core class for secure server-side verification.

#### Constructor
```typescript
new PaymentMonitor(network, monitoredAccount, webhookConfig, options?)
```
- `network`: "TESTNET" | "PUBLIC"
- `monitoredAccount`: string (Public Key)
- `webhookConfig`: `{ url: string, secret: string }`
- `options`: `{ timeoutMinutes: number }`

#### Methods

- **`registerPayment(id, request)`**: Registers an expected payment intent.
  - `id`: Unique session ID / Order ID (must match Memo).
  - `request`: `{ amount, assetCode, issuer, destination }`.
- **`start(intervalMs?)`**: Starts polling the blockchain.
- **`stop()`**: Stops polling.

### `verifySignature(payload, signature, secret)`

Verifies the HMAC-SHA256 signature of an incoming webhook.

- `payload`: The raw JSON string body of the request.
- `signature`: The `X-Signature` header value (hex).
- `secret`: The shared secret key used by `PaymentMonitor`.
- **Returns:** `boolean`

---

## 🔌 Wallet Integration

### `WalletAdapter` Interface

Interface for implementing custom wallets.

```typescript
interface WalletAdapter {
  getPublicKey(): Promise<string>;
  signAndSubmit(xdr: string, network: NetworkName): Promise<{ hash: string }>;
}
```

### `FreighterWallet`

Built-in adapter for the Freighter browser extension.

```typescript
const wallet = new FreighterWallet();
const pubKey = await wallet.getPublicKey();
```

---

## 📊 Type Definitions

### `PaymentRequest`
```typescript
type PaymentRequest = {
  amount: number;
  assetCode: string;
  issuer?: string;
  destination: string;
  memo?: string;
};
```

---

**This API reference is maintained alongside the codebase and updated with each release.**
