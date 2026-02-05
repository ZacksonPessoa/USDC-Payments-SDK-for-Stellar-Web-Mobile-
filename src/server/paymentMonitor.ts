import * as StellarSDK from "stellar-sdk";
import * as crypto from "node:crypto";
import type { PaymentRequest, WebhookConfig } from "../types/webhook";
import { WebhookSender } from "./webhookSender";
import { ValidationError, NetworkError, RateLimitError } from "../core/errors";
import { Database } from "./db";
import { PersistenceAdapter } from "./persistence";
import { RateLimiter, RateLimitConfig } from "./rateLimiter";
import type { JourneyStorageAdapter } from "./journeyStorage";
import { PaymentEventType, createEvent } from "../journey/events";

type MonitorOptions = {
  timeoutMinutes?: number; // Default 15
  adapter?: PersistenceAdapter;
  rateLimit?: RateLimitConfig;
  pollIntervalMs?: number;
  horizonTimeoutMs?: number;
  lockTtlMs?: number;
  instanceId?: string;
  /** Optional: payment journey event store for observability */
  journeyStore?: JourneyStorageAdapter;
};

export class PaymentMonitor {
  private server: StellarSDK.Horizon.Server;
  private monitoredAccount: string;
  private webhookSender: WebhookSender;
  private db: PersistenceAdapter;
  private isPolling = false;
  private network: "TESTNET" | "PUBLIC";
  private timeoutMs: number;
  private rateLimiter: RateLimiter;
  private pollIntervalMs: number;
  private horizonTimeoutMs: number;
  private lockTtlMs: number;
  private instanceId: string;
  private journeyStore?: JourneyStorageAdapter;

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
    this.db = options.adapter || new Database();
    this.rateLimiter = new RateLimiter(options.rateLimit);
    this.pollIntervalMs = options.pollIntervalMs || 5000;
    this.horizonTimeoutMs = options.horizonTimeoutMs || 15000;
    this.lockTtlMs = options.lockTtlMs || 20000;
    this.instanceId = options.instanceId || crypto.randomUUID();
    this.journeyStore = options.journeyStore;

    const horizonUrl = network === "TESTNET"
      ? "https://horizon-testnet.stellar.org"
      : "https://horizon.stellar.org";
    // @ts-ignore - StellarSDK types might not expose timeout in options directly in all versions, passing as any for safety
    this.server = new StellarSDK.Horizon.Server(horizonUrl, { allowHttp: true, timeout: this.horizonTimeoutMs });
  }

  /**
   * Register a payment intent to monitor.
   * Persists to SQLite.
   */
  async registerPayment(sessionId: string, request: PaymentRequest) {
    if (!this.rateLimiter.check()) {
      throw new RateLimitError("Rate limit exceeded for payment registration");
    }

    if (!sessionId) {
      throw new ValidationError("Session ID is required", "sessionId");
    }

    if (!request.amount || request.amount <= 0) {
      throw new ValidationError("Amount must be greater than zero", "amount");
    }

    if (!request.assetCode) {
      throw new ValidationError("Asset code is required", "assetCode");
    }

    if (!request.destination) {
      throw new ValidationError("Destination is required", "destination");
    }

    if (request.assetCode !== "XLM" && !request.issuer) {
      throw new ValidationError(
        "Issuer is required for non-native assets",
        "issuer"
      );
    }

    await this.db.savePayment({
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
   * Uses simple polling with SQLite persistence.
   */
  async start(intervalMs?: number) {
    if (this.isPolling) return;
    this.isPolling = true;

    // Use provided interval or default from options
    const pollInterval = intervalMs || this.pollIntervalMs;

    // Initialize DB
    await this.db.init();
    console.log(`[PaymentMonitor] Started monitoring ${this.monitoredAccount} on ${this.network} (Instance: ${this.instanceId})`);

    // Resume from persisted cursor
    let cursor = await this.db.getCursor();

    // If starting fresh ('now'), resolve to the latest concrete cursor
    if (cursor === "now") {
      try {
        const latest = await this.server.payments()
          .forAccount(this.monitoredAccount)
          .limit(1)
          .order("desc")
          .call();

        if (latest.records.length > 0) {
          cursor = latest.records[0].paging_token;
        } else {
          cursor = "0";
        }
        await this.db.saveCursor(cursor);
      } catch (error) {
         console.warn("[PaymentMonitor] Failed to resolve latest cursor, defaulting to 'now' (polling might skip txs):", error);
      }
    }

    let lastCleanup = 0;
    const cleanupInterval = 5 * 60 * 1000; // 5 minutes

    while (this.isPolling) {
      try {
        // Attempt to acquire lock to ensure single-instance processing
        const locked = await this.db.acquireLock('monitor_lock', this.lockTtlMs, this.instanceId);

        if (locked) {
          try {
            const now = Date.now();
            if (now - lastCleanup > cleanupInterval) {
              await this.db.cleanup(now);
              lastCleanup = now;
            }

            cursor = await this.checkTransactions(cursor);
            await this.db.saveCursor(cursor);
          } finally {
            // Release lock so other instances (or this one) can pick it up next time
            // This prevents lock hoarding if the interval is long
            await this.db.releaseLock('monitor_lock', this.instanceId);
          }
        }
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error("[PaymentMonitor] Error checking transactions:", error);
        // Continue polling even if there's an error
      }
      await new Promise(r => setTimeout(r, pollInterval));
    }
  }

  stop() {
    this.isPolling = false;
  }

  private async checkTransactions(cursor: string): Promise<string> {
    // Fetch recent payments for the account
    let payments;
    try {
      payments = await this.server.payments()
        .forAccount(this.monitoredAccount)
        .cursor(cursor)
        .limit(20)
        .order("asc") // Process in order to not miss updates on cursor
        .call();
    } catch (error) {
      throw new NetworkError(
        `Failed to fetch payments from Horizon: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }

    if (payments.records.length === 0) return cursor;

    // Fetch pending payments from DB
    const pendingList = await this.db.getPendingPayments();
    // Map: Base64(SHA256(SessionID)) -> Payment
    const pendingMap = new Map<string, any>();
    for (const p of pendingList) {
      const hashBuf = StellarSDK.hash(Buffer.from(p.id));
      const hashBase64 = hashBuf.toString("base64");
      pendingMap.set(hashBase64, p);
    }

    let lastToken = cursor;

    for (const record of payments.records) {
      lastToken = record.paging_token;

      // Basic type filtering
      if (record.type !== "payment" && record.type !== "path_payment_strict_send" && record.type !== "path_payment_strict_receive") {
        continue;
      }

      const txHash = record.transaction_hash;

      // Idempotency Check 1: Already processed this transaction hash?
      if (await this.db.isHashProcessed(txHash)) continue;

      // 1. Validate Destination
      if (record.to !== this.monitoredAccount) continue;

      // Need to fetch transaction to get the Memo
      // Optimization: Horizon 'payments' endpoint includes 'transaction' usually if expanded, but here we call .transaction()
      const tx = await record.transaction();

      // tx.memo is the value
      // tx.memo_type indicates type

      if (tx.memo_type === "hash" && tx.memo) {
        const matchedPayment = pendingMap.get(tx.memo);
        if (matchedPayment) {
          await this.confirmPayment(matchedPayment, txHash, record);
          await this.db.markHashProcessed(txHash);
        }
      }
    }

    return lastToken;
  }

  private async confirmPayment(payment: any, txHash: string, paymentRecord: any) {
    const sessionId = payment.id;
    const journeyData = {
      txHash,
      amount: payment.request.amount,
      asset: payment.request.assetCode,
      from: paymentRecord.from,
      to: paymentRecord.to ?? this.monitoredAccount,
      network: this.network,
    };

    if (this.journeyStore) {
      await this.journeyStore.appendEvent(
        createEvent(sessionId, PaymentEventType.TX_SEEN_ON_NETWORK, journeyData)
      );
    }

    // 2. Validate Asset
    const isNative = paymentRecord.asset_type === "native";
    const recordAssetCode = isNative ? "XLM" : paymentRecord.asset_code;
    const recordIssuer = isNative ? undefined : paymentRecord.asset_issuer;

    if (recordAssetCode !== payment.request.assetCode) {
      console.warn(`[PaymentMonitor] Asset mismatch for ${sessionId}. Expected ${payment.request.assetCode}, got ${recordAssetCode}`);
      if (this.journeyStore) {
        await this.journeyStore.appendEvent(
          createEvent(sessionId, PaymentEventType.TX_FAILED, { ...journeyData, error: "Asset mismatch" }, "warn")
        );
      }
      return;
    }

    // 3. Validate Issuer (Strict check for non-native assets)
    if (!isNative && payment.request.issuer && recordIssuer !== payment.request.issuer) {
      console.warn(`[PaymentMonitor] Issuer mismatch for ${sessionId}. Expected ${payment.request.issuer}, got ${recordIssuer}`);
      if (this.journeyStore) {
        await this.journeyStore.appendEvent(
          createEvent(sessionId, PaymentEventType.TX_FAILED, { ...journeyData, error: "Issuer mismatch" }, "warn")
        );
      }
      return;
    }

    // 4. Validate Amount (Amount Received >= Amount Requested)
    const receivedAmount = parseFloat(paymentRecord.amount);
    const requestedAmount = payment.request.amount;

    if (receivedAmount < requestedAmount) {
      console.warn(`[PaymentMonitor] Insufficient amount for ${sessionId}. Expected ${requestedAmount}, got ${receivedAmount}`);
      if (this.journeyStore) {
        await this.journeyStore.appendEvent(
          createEvent(sessionId, PaymentEventType.TX_FAILED, { ...journeyData, error: "Insufficient amount" }, "warn")
        );
      }
      return;
    }

    console.log(`[PaymentMonitor] Payment Confirmed: ${sessionId} (Tx: ${txHash})`);

    if (this.journeyStore) {
      await this.journeyStore.appendEvent(
        createEvent(sessionId, PaymentEventType.TX_CONFIRMED, journeyData)
      );
    }

    // Update status
    await this.db.updatePaymentStatus(sessionId, "confirmed");

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
