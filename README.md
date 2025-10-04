# USDC Payments SDK for Stellar (Web + Mobile)

**One-line checkout SDK to make paying with USDC on Stellar as easy as Stripe.**

---

## ✨ Features (Phase 1)
- `<PayWithUSDC />` React component (drop-in checkout).
- Transaction builder (`createPaymentSession`).
- `signAndSubmit` helper (wraps Stellar SDK + Horizon).
- Ready for Testnet integration.
- Example Next.js webshop included.

---

## 🚀 Quickstart

### Install
```bash
npm i @yourorg/payments-sdk
# USDC Payments SDK for Stellar (Web + Mobile)

**One-line checkout SDK to make paying with USDC on Stellar as easy as Stripe.**

---

## ✨ Features (Phase 1)
- `<PayWithUSDC />` React component (drop-in checkout).
- `createPaymentSession()` – build a USDC payment transaction.
- `signAndSubmit()` – sign & submit transactions via Horizon.
- Error handling (success / fail callbacks).
- Ready for **Testnet integration**.
- Example Next.js webshop included.

---

## 🚀 Quickstart

### Install
```bash
npm i @yourorg/payments-sdk
```

### Usage (Web)
```tsx
import { PayWithUSDC } from '@yourorg/payments-sdk'

<PayWithUSDC
  amount="50"
  destination="GDESTINATIONADDRESS..."
  network="testnet"
  onSuccess={(txHash) => console.log('Payment confirmed:', txHash)}
  onError={(err) => console.error('Payment failed:', err)}
/>
```

---

## 📦 Package Exports
- **PayWithUSDC** → React component (UI checkout).
- **createPaymentSession()** → Builds a Stellar USDC payment transaction.
- **signAndSubmit()** → Signs & submits the transaction to Horizon.

---

## 🧪 Example App (Next.js)
A working demo is provided:

```bash
cd examples/nextjs-demo
npm install
npm run dev
```

This will start a demo webshop on:  
👉 [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Tech Stack
- **Language:** TypeScript  
- **Frontend:** React 18  
- **Blockchain:** Stellar SDK (`stellar-sdk`)  
- **Build:** tsup + tsconfig  
- **CI/CD:** GitHub Actions (build & publish)  

---

## 📅 Roadmap
- **Phase 1:** Web SDK (`<PayWithUSDC />`, tx builder, docs, examples).  
- **Phase 2:** Backend webhooks (payment.confirmed / failed) + SEP-24 helpers.  
- **Phase 3:** React Native SDK + mobile demo app.  
- **Phase 4:** QA, docs, testnet pilots.  
- **Phase 5:** Mainnet release + merchant/fintech partner pilot.  

---

## ⚠️ Security Note
For demo purposes, the example app uses a test secret key in the browser.  
**Never expose private keys in production apps.**  
Integrations should rely on **wallets** (Freighter, Wallet SDK, etc).  

---

## 📖 License
MIT – open source, community-driven.
