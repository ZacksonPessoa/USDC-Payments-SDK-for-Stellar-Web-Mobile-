# USDC Payments SDK for Stellar

**The js-stellar-sdk sends transactions. We operate your checkout** — server-side verification, signed webhooks, idempotency, and reconciliation. Accept USDC payments on Stellar without learning Horizon.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)

> **Status:** Public Beta. Stable on Testnet; Mainnet support is experimental. Not yet recommended for large-scale production use.

---

## Install

```bash
npm install @zacksonpessoa/usdc-payments-sdk

# Server-side only (PaymentMonitor persistence):
npm install sqlite3
```

> **Note:** until the first npm release lands, install from the latest GitHub release tarball:
> `npm install https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-/releases/download/v0.3.4-mvp/zacksonpessoa-usdc-payments-sdk-0.3.4-mvp.tgz`

## Quick start

**Frontend — collect the payment:**

```tsx
import { PayWithUSDC, FreighterWallet } from "@zacksonpessoa/usdc-payments-sdk";

function Checkout() {
  const wallet = new FreighterWallet();

  return (
    <PayWithUSDC
      amount={50}
      destination="GDESTINATION..."
      assetCode="USDC"
      issuer="GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL"
      memo="ORDER_123"
      wallet={wallet}
      onSuccess={(hash) => console.log("Submitted:", hash)}
      onError={(err) => console.error(err)}
    />
  );
}
```

**Backend — verify on-chain and get a signed webhook:**

```ts
import { PaymentMonitor } from "@zacksonpessoa/usdc-payments-sdk/server";

const monitor = new PaymentMonitor("TESTNET", "YOUR_MERCHANT_ADDRESS", {
  url: "https://api.yoursite.com/webhooks/payment",
  secret: process.env.WEBHOOK_SECRET,
});

monitor.registerPayment("ORDER_123", {
  amount: 50,
  assetCode: "USDC",
  issuer: "GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL",
  destination: "YOUR_MERCHANT_ADDRESS",
});

monitor.start();
```

**Webhook handler — always verify the signature:**

```ts
import { verifySignature } from "@zacksonpessoa/usdc-payments-sdk/server";

app.post("/webhooks/payment", (req, res) => {
  const ok = verifySignature(
    JSON.stringify(req.body),
    req.headers["x-signature"],
    process.env.WEBHOOK_SECRET
  );
  if (!ok) return res.status(401).send("Invalid signature");

  // Payment confirmed on-chain — fulfill the order.
  res.send("OK");
});
```

A complete runnable example lives in [`examples/secure-server-example.mjs`](examples/secure-server-example.mjs).

## How it works

1. **Session** — your backend registers a payment intent (`sessionId` = Stellar memo) with the `PaymentMonitor`.
2. **Payment** — the customer connects a wallet (Freighter) via `<PayWithUSDC />`, signs, and the SDK submits to Horizon.
3. **Verification** — the `PaymentMonitor` watches the chain, matches memo/amount/asset/destination, and confirms **server-side**. The client is never trusted.
4. **Webhook** — your backend receives an HMAC-SHA256-signed webhook and fulfills the order.

The SDK is **non-custodial**: USDC moves directly from the payer's wallet to the merchant's wallet. No funds ever pass through intermediary accounts.

## Features

- `<PayWithUSDC />` — drop-in React checkout component
- `createPaymentSession()` / `signAndSubmit()` — transaction building and submission
- `PaymentMonitor` — server-side on-chain verification with SQLite persistence
- Signed webhooks (HMAC-SHA256) with idempotent delivery
- Polling lock with TTL for safe multi-instance deployments
- Built-in rate limiting on session registration
- Payment Journey events (`SESSION_CREATED` → … → `WEBHOOK_SENT`) with SSE streaming
- `PersistenceAdapter` interface — swap SQLite for Postgres/Redis (locking included in the contract)
- Retry with exponential backoff, typed errors, full TypeScript support
- Testnet and Mainnet, XLM / USDC / custom assets

## Security model

Payment confirmation happens **exclusively server-side**, based on on-chain verification via Horizon. The frontend `onSuccess` callback means "submitted", never "confirmed".

Before going live:

- Set `HORIZON_URL`, `NETWORK_PASSPHRASE`, and `WEBHOOK_SECRET` via environment variables
- Verify the `X-Signature` header on every webhook
- Make your webhook handler idempotent
- Keep the SQLite file on a persistent volume, or implement a `PersistenceAdapter` backed by an external database
- Serve webhooks over HTTPS only

Full details and vulnerability reporting: [`SECURITY.md`](SECURITY.md).

## Scaling beyond a single instance

The monitor uses a polling lock (stored via the persistence adapter) so only one instance polls Horizon at a time; if the active instance dies, the lock expires (TTL) and another takes over. For multi-instance deployments, either share the SQLite file or implement `PersistenceAdapter` against Postgres/Redis — `acquireLock`/`releaseLock` are part of the interface.

## API reference

See [`docs/`](docs/) for the full reference: `PayWithUSDC` props, `MonitorOptions`, journey storage, SEP-24 helpers, and wallet adapters.

## License

MIT — see [LICENSE](LICENSE).

Stellar is a trademark of the Stellar Development Foundation. This is an independent project, not affiliated with, sponsored, or endorsed by the SDF. See [Credits / Legal](docs/credits-legal.md).
