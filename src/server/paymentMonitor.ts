import * as StellarSDK from "stellar-sdk";
import type { PaymentRequest, WebhookConfig } from "../types/webhook";
import { WebhookSender } from "./webhookSender";

type MonitoredPayment = {
  id: string; // Session ID / Memo
  request: PaymentRequest;
  status: "pending" | "confirmed" | "failed";
  createdAt: number;
  expiresAt: number;
};

type MonitorOptions = {
  timeoutMinutes?: number; // Default 15
};

export class PaymentMonitor {
  private server: StellarSDK.Horizon.Server;
  private monitoredAccount: string;
  private webhookSender: WebhookSender;
  private pendingPayments: Map<string, MonitoredPayment> = new Map();
  private processedHashes: Set<string> = new Set();
  private isPolling = false;
  private network: "TESTNET" | "PUBLIC";
  private timeoutMs: number;

  constructor(
    network: "TESTNET" | "PUBLIC",
    monitoredAccount: string,
    webhookConfig: WebhookConfig,
    options: MonitorOptions = {}
  ) {
    this.network = network;
    this.monitoredAccount = monitoredAccount;
    this.webhookSender = new WebhookSender(webhookConfig);
    this.timeoutMs = (options.timeoutMinutes || 15) * 60 * 1000;

    const horizonUrl = network === "TESTNET"
      ? "https://horizon-testnet.stellar.org"
      : "https://horizon.stellar.org";
    this.server = new StellarSDK.Horizon.Server(horizonUrl);
  }

  /**
   * Register a payment intent to monitor.
   * In a real app, you would save this to a database.
   */
  registerPayment(sessionId: string, request: PaymentRequest) {
    if (!sessionId) throw new Error("Session ID is required");

    this.pendingPayments.set(sessionId, {
      id: sessionId,
      request,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + this.timeoutMs
    });
    console.log(`[PaymentMonitor] Monitoring payment ${sessionId} for ${request.amount} ${request.assetCode}`);
  }

  /**
   * Start monitoring the account for incoming payments.
   * Uses simple polling for this example.
   */
  async start(intervalMs: number = 5000) {
    if (this.isPolling) return;
    this.isPolling = true;
    console.log(`[PaymentMonitor] Started monitoring ${this.monitoredAccount} on ${this.network}`);

    let cursor = "now";

    while (this.isPolling) {
      try {
        this.cleanupExpiredPayments();
        await this.checkTransactions(cursor);
        // In a real implementation, you would update the cursor properly based on the last tx.
      } catch (e) {
        console.error("[PaymentMonitor] Error checking transactions:", e);
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  stop() {
    this.isPolling = false;
  }

  private cleanupExpiredPayments() {
    const now = Date.now();
    for (const [id, payment] of this.pendingPayments.entries()) {
      if (now > payment.expiresAt) {
        console.log(`[PaymentMonitor] Payment expired: ${id}`);
        this.pendingPayments.delete(id);
      }
    }
  }

  private async checkTransactions(cursor: string) {
    // Fetch recent payments for the account
    const payments = await this.server.payments()
      .forAccount(this.monitoredAccount)
      .limit(20)
      .order("desc")
      .call();

    for (const record of payments.records) {
      // Basic type filtering
      if (record.type !== "payment" && record.type !== "path_payment_strict_send" && record.type !== "path_payment_strict_receive") {
        continue;
      }

      const txHash = record.transaction_hash;

      // Idempotency Check 1: Already processed this transaction hash?
      if (this.processedHashes.has(txHash)) continue;

      // 1. Validate Destination
      // The 'to' field in payment records usually indicates the destination.
      // However, for path payments, we need to be careful.
      // record.to should be the monitored account.
      if (record.to !== this.monitoredAccount) continue;

      // Need to fetch transaction to get the Memo
      const tx = await record.transaction();
      // In Horizon response, tx.memo is the string value (if text/id)
      const memoValue = tx.memo;

      // Check if this memo matches any pending payment
      if (memoValue && this.pendingPayments.has(memoValue)) {
        await this.confirmPayment(memoValue, txHash, record);
        this.processedHashes.add(txHash);
      }
    }
  }

  private async confirmPayment(sessionId: string, txHash: string, paymentRecord: any) {
    const payment = this.pendingPayments.get(sessionId)!;

    // Idempotency Check 2: Already confirmed? (Should be handled by map removal, but double check)
    if (payment.status === "confirmed") return;

    // 2. Validate Asset
    const isNative = paymentRecord.asset_type === "native";
    const recordAssetCode = isNative ? "XLM" : paymentRecord.asset_code;
    const recordIssuer = isNative ? undefined : paymentRecord.asset_issuer;

    if (recordAssetCode !== payment.request.assetCode) {
      console.warn(`[PaymentMonitor] Asset mismatch for ${sessionId}. Expected ${payment.request.assetCode}, got ${recordAssetCode}`);
      return;
    }

    // 3. Validate Issuer (Strict check for non-native assets)
    if (!isNative && payment.request.issuer && recordIssuer !== payment.request.issuer) {
      console.warn(`[PaymentMonitor] Issuer mismatch for ${sessionId}. Expected ${payment.request.issuer}, got ${recordIssuer}`);
      return;
    }

    // 4. Validate Amount (Amount Received >= Amount Requested)
    const receivedAmount = parseFloat(paymentRecord.amount);
    const requestedAmount = payment.request.amount;

    if (receivedAmount < requestedAmount) {
      console.warn(`[PaymentMonitor] Insufficient amount for ${sessionId}. Expected ${requestedAmount}, got ${receivedAmount}`);
      return;
    }

    console.log(`[PaymentMonitor] Payment Confirmed: ${sessionId} (Tx: ${txHash})`);

    // Update status
    payment.status = "confirmed";
    this.pendingPayments.delete(sessionId); // Stop monitoring this one

    // Send Webhook
    await this.webhookSender.sendEvent({
      id: `evt_${Date.now()}`,
      type: "payment.confirmed",
      timestamp: new Date().toISOString(),
      sessionId,
      paymentRequest: payment.request,
      transactionHash: txHash,
      metadata: {
        sender: paymentRecord.from,
        amount: paymentRecord.amount,
        asset: recordAssetCode
      }
    });
  }
}
