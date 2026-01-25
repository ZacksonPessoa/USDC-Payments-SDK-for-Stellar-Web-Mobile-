/**
 * ✅ REFERENCE IMPLEMENTATION: Secure Server Verification
 *
 * This example demonstrates the correct v0.2.0-mvp flow:
 * 1. Intent is registered on the server (PaymentMonitor).
 * 2. PaymentMonitor watches the blockchain.
 * 3. PaymentMonitor confirms payment and sends a signed webhook.
 *
 * NOTE: This example uses HTTP for demonstration. In production, ALWAYS use HTTPS for webhooks.
 */

import { PaymentMonitor, generateSignature, verifySignature } from "../dist/server.mjs";
import { createPaymentSession } from "../dist/index.mjs";
import http from "http";
import * as StellarSDK from "stellar-sdk";

/**
 * MOCK MERCHANT BACKEND
 * Receives the signed webhook.
 */
const MERCHANT_PORT = 3001;
const WEBHOOK_SECRET = "my_super_secure_secret_key_123";

const startMerchantServer = () => {
  console.warn("⚠️  WARNING: DO NOT USE IN PRODUCTION WITHOUT HTTPS/TLS ⚠️");
  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/webhook") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        const signature = req.headers["x-signature"];

        // 1. Verify Signature
        const isValid = verifySignature(body, signature, WEBHOOK_SECRET);

        if (isValid) {
          console.log("\n[Merchant] ✅ Webhook Received & Verified!");
          console.log("[Merchant] Payload:", JSON.parse(body));
          res.writeHead(200);
          res.end("OK");
        } else {
          console.log("\n[Merchant] ❌ Invalid Signature!");
          res.writeHead(401);
          res.end("Unauthorized");
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(MERCHANT_PORT, () => {
    console.log(`[Merchant] Listening for webhooks on port ${MERCHANT_PORT}`);
  });

  return server;
};

/**
 * HELPER: Fund account with Friendbot
 */
const fundAccount = async (publicKey) => {
  try {
    const response = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
    if (!response.ok) throw new Error("Friendbot failed");
    console.log(`[Setup] Account funded: ${publicKey}`);
  } catch (e) {
    console.warn(`[Setup] Failed to fund account (might already exist): ${e.message}`);
  }
};

/**
 * MAIN SIMULATION
 */
const run = async () => {
  // 0. Setup Merchant Wallet (Generate & Fund)
  const keypair = StellarSDK.Keypair.random();
  const storeWallet = keypair.publicKey();
  console.log(`[Setup] Generated Merchant Wallet: ${storeWallet}`);
  await fundAccount(storeWallet);

  // 1. Start Merchant Server
  const merchantServer = startMerchantServer();

  // 2. Start Payment Monitor (The "Middleware" or Service)
  // NOTE: This will create a 'usdc_payments.db' file for persistence.
  const monitor = new PaymentMonitor("TESTNET", storeWallet, {
    url: `http://localhost:${MERCHANT_PORT}/webhook`,
    secret: WEBHOOK_SECRET
  });

  // Start monitoring
  monitor.start(2000); // Check every 2s

  // 3. Create a Payment Intent (Frontend/Backend)
  console.log("\n[App] Creating Payment Session...");
  const session = await createPaymentSession({
    amount: 10,
    assetCode: "XLM",
    destination: storeWallet,
  });

  // Register intent with the monitor
  console.log(`[App] Session Created. ID: ${session.id}`);
  await monitor.registerPayment(session.id, session.request);

  console.log("\n[App] ⏳ Waiting for payment... (Simulating only)");
  console.log("[App] To test for real, you would send XLM to:");
  console.log(`      ${storeWallet}`);
  console.log(`      Memo: ${session.id}`);

  // 4. (Optional) Simulate a fake transaction confirmation for demo purposes
  // Since we don't want to complicate this script with actual signing/sending of another payment,
  // we will leave it running for a few seconds.
  // If you send 10 XLM to the address above with the Memo, it WILL trigger the webhook!

  // Let's wait 10 seconds then shut down.
  setTimeout(() => {
    console.log("\n[App] Stopping simulation.");
    monitor.stop();
    merchantServer.close();
    process.exit(0);
  }, 15000);
};

run().catch(console.error);
