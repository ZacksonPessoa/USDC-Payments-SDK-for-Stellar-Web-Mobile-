# API Reference — USDC Payments SDK for Stellar

Complete API reference for the USDC Payments SDK for Stellar (Web + Mobile).

---

## 📦 Package Exports

```typescript
// Main component
export { default as PayWithUSDC } from "./components/PayWithUSDC";

// Core functions
export { createPaymentSession } from "./core/createPaymentSession";
export { signAndSubmit } from "./core/signAndSubmit";

// Wallet adapters
export { FreighterWallet } from "./core/freighterAdapter";

// Type definitions
export type { 
  PaymentRequest, 
  PaymentSession, 
  WalletAdapter, 
  NetworkName 
} from "./types";
```

---

## 🧩 PayWithUSDC Component

### Props Interface

```typescript
interface PayWithUSDCProps {
  // Required props
  amount: number;
  destination: string;
  wallet: WalletAdapter;
  
  // Optional props
  assetCode?: string;           // Default: "XLM"
  issuer?: string;              // Required for non-native assets
  memo?: string;
  network?: NetworkName;       // Default: "TESTNET"
  source?: string;             // Optional source address
  label?: string;              // Default: "Pay"
  
  // Callbacks
  onSuccess?: (hash: string) => void;
  onError?: (error: unknown) => void;
}
```

### Usage Examples

#### Basic XLM Payment
```tsx
<PayWithUSDC
  amount={10}
  destination="GDESTINATIONADDRESS..."
  wallet={wallet}
  onSuccess={(hash) => console.log('Payment sent:', hash)}
/>
```

#### USDC Payment with Issuer
```tsx
<PayWithUSDC
  amount={50}
  destination="GDESTINATIONADDRESS..."
  assetCode="USDC"
  issuer="GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL"
  wallet={wallet}
  memo="Payment for order #123"
  onSuccess={(hash) => console.log('USDC sent:', hash)}
/>
```

#### Custom Styling and Labels
```tsx
<PayWithUSDC
  amount={25}
  destination="GDESTINATIONADDRESS..."
  wallet={wallet}
  label="💳 Pay with USDC"
  onSuccess={(hash) => {
    setPaymentStatus('completed');
    setTransactionHash(hash);
  }}
  onError={(error) => {
    setPaymentStatus('failed');
    setErrorMessage(error.message);
  }}
/>
```

---

## 🔧 Core Functions

### createPaymentSession()

Creates a Stellar payment transaction session.

#### Signature
```typescript
function createPaymentSession(
  request: PaymentRequest, 
  sourcePublicKey?: string
): Promise<PaymentSession>
```

#### Parameters
- `request: PaymentRequest` - Payment details
- `sourcePublicKey?: string` - Optional source account public key

#### Returns
- `Promise<PaymentSession>` - Payment session with XDR

#### Example
```typescript
import { createPaymentSession } from '@zacksonpessoa/usdc-payments-sdk';

const session = await createPaymentSession({
  amount: 50,
  assetCode: "USDC",
  issuer: "GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL",
  destination: "GDESTINATIONADDRESS...",
  memo: "Payment for order #123"
}, "GSOURCEADDRESS...");

console.log('Session ID:', session.id);
console.log('XDR Length:', session.xdr.length);
```

#### Error Handling
```typescript
try {
  const session = await createPaymentSession(request);
} catch (error) {
  if (error.message.includes('Invalid PaymentRequest')) {
    console.error('Invalid payment parameters');
  } else if (error.message.includes('issuer required')) {
    console.error('Issuer required for non-native assets');
  } else {
    console.error('Failed to create payment session:', error);
  }
}
```

### signAndSubmit()

Signs and submits a transaction to the Stellar network.

#### Signature
```typescript
function signAndSubmit(
  xdr: string, 
  secret: string
): Promise<{ hash: string }>
```

#### Parameters
- `xdr: string` - Transaction XDR (base64 encoded)
- `secret: string` - Secret key for signing (S...)

#### Returns
- `Promise<{ hash: string }>` - Transaction hash

#### Example
```typescript
import { signAndSubmit } from '@zacksonpessoa/usdc-payments-sdk';

const result = await signAndSubmit(session.xdr, "S...SECRETKEY");
console.log('Transaction hash:', result.hash);
```

#### Error Handling
```typescript
try {
  const result = await signAndSubmit(xdr, secret);
} catch (error) {
  if (error.message.includes('insufficient balance')) {
    console.error('Insufficient account balance');
  } else if (error.message.includes('invalid address')) {
    console.error('Invalid destination address');
  } else {
    console.error('Transaction failed:', error);
  }
}
```

---

## 🔌 Wallet Integration

### WalletAdapter Interface

```typescript
interface WalletAdapter {
  getPublicKey(): Promise<string>;
  signAndSubmit(xdr: string, network: NetworkName): Promise<{ hash: string }>;
}
```

### FreighterWallet Implementation

```typescript
import { FreighterWallet } from '@zacksonpessoa/usdc-payments-sdk';

const wallet = new FreighterWallet();

// Check if Freighter is available
if (window.freighterApi) {
  const publicKey = await wallet.getPublicKey();
  console.log('Connected to Freighter:', publicKey);
} else {
  console.log('Freighter extension not found');
}
```

### Custom Wallet Adapter

```typescript
class CustomWallet implements WalletAdapter {
  async getPublicKey(): Promise<string> {
    // Your wallet's getPublicKey implementation
    return "G...PUBLICKEY";
  }

  async signAndSubmit(xdr: string, network: NetworkName): Promise<{ hash: string }> {
    // Your wallet's signAndSubmit implementation
    const hash = await this.signTransaction(xdr, network);
    return { hash };
  }

  private async signTransaction(xdr: string, network: NetworkName): Promise<string> {
    // Custom signing logic
    return "transaction-hash";
  }
}
```

---

## 📊 Type Definitions

### PaymentRequest

```typescript
type PaymentRequest = {
  amount: number;              // Payment amount
  assetCode: string;           // Asset code (e.g., "XLM", "USDC")
  issuer?: string;             // Asset issuer (required for non-native assets)
  destination: string;          // Destination Stellar address
  memo?: string;              // Optional transaction memo
};
```

### PaymentSession

```typescript
type PaymentSession = {
  id: string;                  // Unique session identifier
  request: PaymentRequest;     // Original payment request
  xdr: string;                 // Transaction XDR (base64 encoded)
};
```

### NetworkName

```typescript
type NetworkName = "TESTNET" | "PUBLIC";
```

### WalletAdapter

```typescript
interface WalletAdapter {
  getPublicKey(): Promise<string>;
  signAndSubmit(xdr: string, network: NetworkName): Promise<{ hash: string }>;
}
```

---

## 🌐 Network Configuration

### Testnet (Default)

```typescript
const TESTNET_CONFIG = {
  horizonUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: Networks.TESTNET,
  friendbotUrl: "https://friendbot.stellar.org"
};
```

### Mainnet

```typescript
const MAINNET_CONFIG = {
  horizonUrl: "https://horizon.stellar.org",
  networkPassphrase: Networks.PUBLIC,
  friendbotUrl: null
};
```

### Network Selection

```typescript
import { Networks } from 'stellar-sdk';

function getNetworkConfig(network: NetworkName) {
  return network === "TESTNET" 
    ? {
        horizonUrl: "https://horizon-testnet.stellar.org",
        networkPassphrase: Networks.TESTNET
      }
    : {
        horizonUrl: "https://horizon.stellar.org",
        networkPassphrase: Networks.PUBLIC
      };
}
```

---

## 🔒 Security Best Practices

### Private Key Handling

#### ❌ Never Do This (Production)
```typescript
// Exposing private keys in client-side code
const secret = "S...PRIVATE_KEY";
const result = await signAndSubmit(xdr, secret);
```

#### ✅ Do This Instead (Production)
```typescript
// Use wallet integration
const wallet = new FreighterWallet();
const result = await wallet.signAndSubmit(xdr, "TESTNET");
```

### Input Validation

```typescript
function validatePaymentRequest(request: PaymentRequest): boolean {
  // Validate amount
  if (!request.amount || request.amount <= 0) {
    throw new Error('Invalid amount');
  }

  // Validate destination address
  if (!request.destination || !request.destination.startsWith('G')) {
    throw new Error('Invalid destination address');
  }

  // Validate asset code
  if (!request.assetCode) {
    throw new Error('Asset code required');
  }

  // Validate issuer for non-native assets
  if (request.assetCode !== 'XLM' && !request.issuer) {
    throw new Error('Issuer required for non-native assets');
  }

  return true;
}
```

### Error Handling

```typescript
function handlePaymentError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('insufficient balance')) {
      return 'Insufficient account balance';
    }
    if (error.message.includes('invalid address')) {
      return 'Invalid destination address';
    }
    if (error.message.includes('network error')) {
      return 'Network connection failed';
    }
  }
  return 'Payment failed. Please try again.';
}
```

---

## 🧪 Testing

### Unit Testing

```typescript
import { createPaymentSession } from '@zacksonpessoa/usdc-payments-sdk';

describe('createPaymentSession', () => {
  it('should create a valid payment session', async () => {
    const request = {
      amount: 10,
      assetCode: 'XLM',
      destination: 'GDESTINATIONADDRESS...'
    };

    const session = await createPaymentSession(request);
    
    expect(session.id).toBeDefined();
    expect(session.request).toEqual(request);
    expect(session.xdr).toBeDefined();
  });

  it('should throw error for invalid request', async () => {
    const invalidRequest = {
      amount: 0, // Invalid amount
      assetCode: 'XLM',
      destination: 'GDESTINATIONADDRESS...'
    };

    await expect(createPaymentSession(invalidRequest))
      .rejects.toThrow('Invalid PaymentRequest');
  });
});
```

### Integration Testing

```typescript
import { PayWithUSDC } from '@zacksonpessoa/usdc-payments-sdk';

describe('PayWithUSDC Component', () => {
  it('should render payment button', () => {
    const mockWallet = {
      getPublicKey: jest.fn().mockResolvedValue('G...'),
      signAndSubmit: jest.fn().mockResolvedValue({ hash: 'test-hash' })
    };

    render(
      <PayWithUSDC
        amount={10}
        destination="GDESTINATIONADDRESS..."
        wallet={mockWallet}
      />
    );

    expect(screen.getByText('Pay 10 XLM')).toBeInTheDocument();
  });
});
```

---

## 🚀 Performance Optimization

### Bundle Size

The SDK is optimized for minimal bundle size:

- **External Dependencies** - React/React-DOM marked as external
- **Tree Shaking** - ESM format enables tree shaking
- **Single Bundle** - No code splitting for simplicity
- **Source Maps** - Available for debugging

### Runtime Performance

```typescript
// Optimize by caching wallet connection
const walletCache = new Map();

function getCachedWallet(adapter: WalletAdapter): WalletAdapter {
  const cacheKey = adapter.constructor.name;
  
  if (!walletCache.has(cacheKey)) {
    walletCache.set(cacheKey, adapter);
  }
  
  return walletCache.get(cacheKey);
}

// Use cached wallet
const wallet = getCachedWallet(new FreighterWallet());
```

---

## 📚 Additional Resources

### Documentation
- **Main README** - [../README.md](../README.md)
- **Architecture Docs** - [../docs/architecture.md](../docs/architecture.md)
- **Examples** - [../examples/README](../examples/README)

### External Resources
- **Stellar SDK** - [stellar-sdk documentation](https://stellar.github.io/js-stellar-sdk/)
- **Stellar Network** - [Stellar.org docs](https://developers.stellar.org/)
- **React** - [React documentation](https://react.dev/)

### Community
- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Community support
- **Stellar Community** - [community.stellar.org](https://community.stellar.org)

---

**This API reference is maintained alongside the codebase and updated with each release.**
