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
- **`WebhookManager`** - Real-time payment notifications (NEW!)
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

### Basic Usage

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
      wallet={wallet}
      onSuccess={(hash) => console.log('Payment confirmed:', hash)}
      onError={(error) => console.error('Payment failed:', error)}
    />
  );
}
```

### XLM Payment (Native Asset)

```tsx
<PayWithUSDC
  amount={10}
  destination="GDESTINATIONADDRESS..."
  assetCode="XLM"
  wallet={wallet}
  onSuccess={(hash) => console.log('XLM sent:', hash)}
/>
```

---

## 🔗 Webhook Support (NEW!)

Get real-time notifications about payment events:

```typescript
import { webhookManager, createPaymentSession, signAndSubmit } from '@zacksonpessoa/usdc-payments-sdk';

// Configure webhook
webhookManager.registerWebhook("merchant-backend", {
  url: "https://api.merchant.com/webhooks/stellar-payments",
  secret: "your-webhook-secret",
  retryAttempts: 5,
  timeout: 10000
});

// Use SDK normally - webhooks are sent automatically
const session = await createPaymentSession({
  amount: 50,
  assetCode: "USDC",
  issuer: "GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL",
  destination: "GDESTINATIONADDRESS...",
  memo: "Order #123"
});

const result = await signAndSubmit(session.xdr, "S...SECRETKEY", session.id, session.request);
```

**Events:** `payment.created`, `payment.submitted`, `payment.confirmed`, `payment.failed`

📖 **[Complete Webhook Documentation](docs/webhook-support.md)**

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
| `memo` | `string` | ❌ | Transaction memo |
| `network` | `"TESTNET" \| "PUBLIC"` | ❌ | Network (default: "TESTNET") |
| `source` | `string` | ❌ | Source address (optional) |
| `label` | `string` | ❌ | Button label (default: "Pay") |
| `onSuccess` | `(hash: string) => void` | ❌ | Success callback |
| `onError` | `(error: unknown) => void` | ❌ | Error callback |

### Core Functions

#### `createPaymentSession(request, sourcePublicKey?)`

Creates a Stellar payment transaction session.

```typescript
import { createPaymentSession } from '@zacksonpessoa/usdc-payments-sdk';

const session = await createPaymentSession({
  amount: 50,
  assetCode: "USDC",
  issuer: "GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL",
  destination: "GDESTINATIONADDRESS...",
  memo: "Payment for order #123"
}, "GSOURCEADDRESS...");
```

#### `signAndSubmit(xdr, secretKey)`

Signs and submits a transaction to Stellar Horizon.

```typescript
import { signAndSubmit } from '@zacksonpessoa/usdc-payments-sdk';

const result = await signAndSubmit(session.xdr, "S...SECRETKEY");
console.log('Transaction hash:', result.hash);
```

### Wallet Adapter Interface

```typescript
interface WalletAdapter {
  getPublicKey(): Promise<string>;
  signAndSubmit(xdr: string, network: NetworkName): Promise<{ hash: string }>;
}
```

---

## 🧪 Examples

### Next.js Demo

A complete working example is included:

```bash
cd examples
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the demo.

### Sandbox Testing

Test the SDK functionality with the included sandbox:

```bash
npm run build
node sandbox.mjs
```

This will:
1. Create a testnet account
2. Fund it via Friendbot
3. Create a payment session
4. Sign and submit a transaction
5. Demonstrate component usage

---

## 🛠️ Development

### Project Structure

```
src/
├── components/
│   └── PayWithUSDC.tsx      # Main React component
├── core/
│   ├── createPaymentSession.ts  # Transaction builder
│   ├── signAndSubmit.ts         # Transaction submitter
│   └── freighterAdapter.ts      # Freighter wallet adapter
├── types.ts                     # TypeScript definitions
└── index.ts                     # Main exports
```

### Build Commands

```bash
# Development build with watch
npm run dev

# Production build
npm run build

# Clean build artifacts
npm run clean
```

### Tech Stack

- **Language:** TypeScript 5.9+
- **Frontend:** React 19
- **Blockchain:** Stellar SDK 13.3.0
- **Build:** tsup (ESM + CJS + DTS)
- **Testing:** Node.js sandbox + Next.js example

---

## 🔧 Configuration

### TypeScript

The SDK is fully typed. Import types as needed:

```typescript
import type { 
  PaymentRequest, 
  PaymentSession, 
  WalletAdapter, 
  NetworkName 
} from '@zacksonpessoa/usdc-payments-sdk';
```

### Build Configuration

The SDK builds to multiple formats:
- **ESM** (`dist/index.js`) - Modern bundlers
- **CJS** (`dist/index.cjs`) - Node.js/legacy bundlers  
- **DTS** (`dist/index.d.ts`) - TypeScript definitions

---

## 🌐 Network Support

### Testnet (Default)
- **Horizon:** `https://horizon-testnet.stellar.org`
- **Friendbot:** `https://friendbot.stellar.org`
- **Network Passphrase:** Testnet

### Mainnet (Production)
- **Horizon:** `https://horizon.stellar.org`
- **Network Passphrase:** Public

---

## 🔒 Security

### Production Considerations

⚠️ **Never expose private keys in production apps!**

The SDK is designed to work with wallet integrations:

- **Freighter** - Browser extension wallet
- **Wallet SDK** - Mobile wallet integration
- **Custom adapters** - Implement `WalletAdapter` interface

### Testnet Usage

The included examples use testnet for development and testing. Always use testnet during development.

---

## 📅 Roadmap

### Phase 1 ✅ (Current)
- [x] Core SDK with React component
- [x] Transaction builder and submitter
- [x] Freighter wallet integration
- [x] TypeScript support
- [x] Testnet integration
- [x] Next.js example app

### Phase 2 (In Progress)
- [x] Backend webhook support ✅
- [ ] SEP-24 on/off-ramp helpers
- [ ] Payment confirmation flows
- [ ] Error handling improvements

### Phase 3 (Planned)
- [ ] React Native SDK
- [ ] Mobile wallet adapters
- [ ] Cross-platform examples

### Phase 4 (Planned)
- [ ] Mainnet production release
- [ ] Merchant pilot programs
- [ ] Performance optimizations

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Setup

```bash
git clone https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-
cd USDC-Payments-SDK-for-Stellar-Web-Mobile-
npm install
npm run dev
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Stellar Development Foundation** - For the amazing blockchain platform
- **Stellar Community** - For feedback and support
- **Open Source Contributors** - For making this possible

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-/issues)
- **Discussions:** [GitHub Discussions](https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-/discussions)
- **Documentation:** [docs/](docs/)

---

**Made with ❤️ for the Stellar ecosystem**