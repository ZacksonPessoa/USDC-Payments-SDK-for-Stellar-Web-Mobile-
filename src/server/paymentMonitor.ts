import * as StellarSDK from "stellar-sdk";
import type { PaymentRequest, WebhookConfig, WebhookEventType } from "../types/webhook";
import { WebhookSender } from "./webhookSender";

type MonitoredPayment = {
  id: string; // Session ID / Memo
  request: PaymentRequest;
  status: "pending" | "confirmed" | "failed";
  createdAt: number;
};

export class PaymentMonitor {
  private server: StellarSDK.Horizon.Server;
  private monitoredAccount: string;
  private webhookSender: WebhookSender;
  private pendingPayments: Map<string, MonitoredPayment> = new Map();
  private processedHashes: Set<string> = new Set();
  private isPolling = false;
  private network: "TESTNET" | "PUBLIC";

  constructor(
    network: "TESTNET" | "PUBLIC",
    monitoredAccount: string,
    webhookConfig: WebhookConfig
  ) {
    this.network = network;
    this.monitoredAccount = monitoredAccount;
    this.webhookSender = new WebhookSender(webhookConfig);

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
    this.pendingPayments.set(sessionId, {
      id: sessionId,
      request,
      status: "pending",
      createdAt: Date.now()
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
        await this.checkTransactions(cursor);
        // In a real implementation, you would update the cursor properly based on the last tx.
        // For simplicity here, we just check recent transactions.
      } catch (e) {
        console.error("[PaymentMonitor] Error checking transactions:", e);
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  stop() {
    this.isPolling = false;
  }

  private async checkTransactions(cursor: string) {
    // Fetch recent payments for the account
    const payments = await this.server.payments()
      .forAccount(this.monitoredAccount)
      .limit(10)
      .order("desc")
      .call();

    for (const record of payments.records) {
      if (record.type !== "payment" && record.type !== "path_payment_strict_send" && record.type !== "path_payment_strict_receive") {
        continue;
      }

      const txHash = record.transaction_hash;
      if (this.processedHashes.has(txHash)) continue;

      // Need to fetch transaction to get the Memo
      const tx = await record.transaction();
      // In Horizon response, tx.memo is the string value (if text/id)
      const memoValue = tx.memo;

      // Check if this memo matches any pending payment
      // Note: Memo in SDK might be text or id.
      // We assume sessionId matches the memo text.

      if (memoValue && this.pendingPayments.has(memoValue)) {
        await this.confirmPayment(memoValue, txHash, record);
        this.processedHashes.add(txHash);
      }
    }
  }

  private async confirmPayment(sessionId: string, txHash: string, paymentRecord: any) {
    const payment = this.pendingPayments.get(sessionId)!;

    // Validate Amount and Asset
    // Note: paymentRecord from Horizon has 'amount', 'asset_type', 'asset_code', 'asset_issuer'

    // Simple validation logic (should be more robust in production)
    const isNative = paymentRecord.asset_type === "native";
    const recordAssetCode = isNative ? "XLM" : paymentRecord.asset_code;
    const recordIssuer = isNative ? undefined : paymentRecord.asset_issuer;

    if (recordAssetCode !== payment.request.assetCode) {
      console.warn(`[PaymentMonitor] Asset mismatch for ${sessionId}`);
      return;
    }

    if (parseFloat(paymentRecord.amount) < payment.request.amount) {
      console.warn(`[PaymentMonitor] Insufficient amount for ${sessionId}`);
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
        amount: paymentRecord.amount
      }
    });
  }
}
