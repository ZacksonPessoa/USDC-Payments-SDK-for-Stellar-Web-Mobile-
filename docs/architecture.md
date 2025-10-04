# USDC Payments SDK for Stellar — UML Diagrams (Mermaid)

> These diagrams are GitHub-friendly (Mermaid) and should render directly in the repo.

---

## 1) Payment Flow — Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant M as Merchant App (Web/Mobile)
    participant SDK as Payments SDK
    participant H as Stellar Horizon (Testnet/Mainnet)
    participant B as Merchant Backend (Webhooks)

    U->>M: Clicks <PayWithUSDC />
    M->>SDK: createPaymentSession(amount, destination, memo, network)
    SDK-->>M: unsigned Transaction (XDR)

    note over M: Wallet signs the transaction (Freighter / Wallet SDK)

    M->>SDK: signAndSubmit(signedTx, network)
    SDK->>H: submitTransaction()
    H-->>SDK: txHash / result
    SDK-->>M: onSuccess(txHash)

    M->>B: POST /webhook payment.confirmed { txHash, amount, account }

    alt Failure path
      SDK-->>M: onError(error)
      M->>B: POST /webhook payment.failed { error, context }
    end
```

---

## 2) SDK Structure — Class Diagram

```mermaid
classDiagram
  class PayWithUSDC {
    +props: PayWithUSDCProps
    +render(): JSX.Element
    +handlePay(): void
  }

  class PayWithUSDCProps {
    +amount: string|number
    +destination: string
    +memo: string
    +network: "testnet"|"public"
    +onSuccess(txHash): void
    +onError(err): void
  }

  class PaymentSession {
    +createPaymentSession(input): Transaction
    <<utility>>
  }

  class Signer {
    +signAndSubmit(tx, secretKey, network): string
    <<utility>>
  }

  class Config {
    +issuer: string
    +network: string
    +serverUrl: string
  }

  class WebhookClient {
    +emitConfirmed(payload): void
    +emitFailed(payload): void
    <<phase2>>
  }

  PayWithUSDC --> PayWithUSDCProps : uses
  PayWithUSDC --> PaymentSession : builds
  PayWithUSDC --> Signer : submits
  PaymentSession --> Config : reads
  Signer --> Config : reads
  PayWithUSDC --> WebhookClient : notifies (Phase 2)
```

---

## 3) Optional — On/Off-ramp (SEP-24) Flow (Phase 2)

```mermaid
flowchart LR
    A[User in Merchant App] --> B[SDK: start SEP-24 flow]
    B --> C[Open Provider or Anchor interactive URL]
    C --> D{KYC required?}
    D -->|Yes| E[Collect KYC from provider or app]
    D -->|No| F[Proceed to deposit or withdraw]
    E --> F
    F --> G[Provider completes transfer]
    G --> H[SDK callback]
    H --> I[Merchant Backend webhook: deposit or withdraw completed]

```

---

## Notes
- **Phase 1**: `PayWithUSDC`, `createPaymentSession`, `signAndSubmit`.
- **Phase 2**: Webhooks + SEP-24 helper modules.
- Replace secret handling with **wallet-based signing** (Freighter / Wallet SDK) in production.
