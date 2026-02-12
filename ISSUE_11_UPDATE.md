# Public Beta Feedback Thread (v0.3.3-mvp)

**This is the official feedback thread for the Public Beta (v0.3.3-mvp) of the USDC Payments SDK.**

We are currently testing the SDK on **Stellar Testnet**.

### 📦 Latest Release: v0.3.3-mvp

**Installation (Recommended):**
Install directly via the GitHub Release tarball:
```bash
npm install https://github.com/ZacksonPessoa/USDC-Payments-SDK-for-Stellar-Web-Mobile-/releases/download/v0.3.3-mvp/zacksonpessoa-usdc-payments-sdk-0.3.3-mvp.tgz
```

### 🆕 What changed since v0.3.2-mvp?

*   **Distribution:** Switched to GitHub Release tarballs (no longer using npm registry for beta).
*   **Build Verification:** Added `scripts/verify-build.mjs` to ensure build integrity.
*   **Server Exports:** Corrected server-side exports to `@zacksonpessoa/usdc-payments-sdk/server`.
*   **Documentation:** Major README overhaul with clear "Browser vs Server" usage.
*   **Production-Lite:** Hardened `PaymentMonitor` with polling locks (SQLite default).

### ⚠️ Known Limitations (Public Beta)

1.  **Network:** Primarily designed for **Testnet** usage. Mainnet is experimental.
2.  **Persistence:** Defaults to SQLite. For high-scale production, implement a custom `PersistenceAdapter` (e.g., PostgreSQL).
3.  **Mobile:** React Native support is planned but not yet implemented.
4.  **Wallet Support:** Currently supports Freighter.

### 💬 How to provide feedback

Please leave a comment below with:
1.  **Bugs:** Unexpected behavior or errors.
2.  **DX Friction:** Anything that felt hard to set up or understand.
3.  **Feature Requests:** What's missing for your use case?

---
*Maintained by @ZacksonPessoa*
