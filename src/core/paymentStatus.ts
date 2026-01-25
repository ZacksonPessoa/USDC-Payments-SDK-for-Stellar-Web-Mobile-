/**
 * Payment status tracking and confirmation flows
 */

export type PaymentStatus = 
  | "idle"           // Initial state
  | "creating"       // Creating payment session
  | "signing"        // Transaction being signed
  | "submitting"     // Transaction being submitted
  | "submitted"      // Transaction submitted to network (not confirmed)
  | "confirmed"      // Payment confirmed on-chain
  | "failed"         // Payment failed
  | "expired";       // Payment expired

export interface PaymentStatusInfo {
  status: PaymentStatus;
  transactionHash?: string;
  error?: string;
  errorCode?: string;
  timestamp: number;
}

export class PaymentStatusTracker {
  private status: PaymentStatus = "idle";
  private info: PaymentStatusInfo;

  constructor() {
    this.info = {
      status: "idle",
      timestamp: Date.now(),
    };
  }

  getStatus(): PaymentStatus {
    return this.status;
  }

  getInfo(): PaymentStatusInfo {
    return { ...this.info };
  }

  setStatus(status: PaymentStatus, metadata?: Partial<PaymentStatusInfo>) {
    this.status = status;
    this.info = {
      ...this.info,
      status,
      timestamp: Date.now(),
      ...metadata,
    };
  }

  setCreating() {
    this.setStatus("creating");
  }

  setSigning() {
    this.setStatus("signing");
  }

  setSubmitting() {
    this.setStatus("submitting");
  }

  setSubmitted(transactionHash: string) {
    this.setStatus("submitted", { transactionHash });
  }

  setConfirmed(transactionHash: string) {
    this.setStatus("confirmed", { transactionHash });
  }

  setFailed(error: string, errorCode?: string) {
    this.setStatus("failed", { error, errorCode });
  }

  setExpired() {
    this.setStatus("expired");
  }

  reset() {
    this.status = "idle";
    this.info = {
      status: "idle",
      timestamp: Date.now(),
    };
  }

  isPending(): boolean {
    return ["creating", "signing", "submitting", "submitted"].includes(this.status);
  }

  isFinal(): boolean {
    return ["confirmed", "failed", "expired"].includes(this.status);
  }

  isSuccess(): boolean {
    return this.status === "confirmed";
  }
}

/**
 * Helper to check if a transaction hash is confirmed on the network
 * This should be called server-side, not client-side
 */
export async function checkTransactionStatus(
  transactionHash: string,
  network: "TESTNET" | "PUBLIC" = "TESTNET"
): Promise<{
  confirmed: boolean;
  success: boolean;
  ledger?: number;
  timestamp?: string;
}> {
  const horizonUrl = network === "PUBLIC"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";

  try {
    const response = await fetch(`${horizonUrl}/transactions/${transactionHash}`);
    
    if (!response.ok) {
      return { confirmed: false, success: false };
    }

    const data = await response.json();
    
    return {
      confirmed: true,
      success: data.successful,
      ledger: data.ledger,
      timestamp: data.created_at,
    };
  } catch (error) {
    return { confirmed: false, success: false };
  }
}
