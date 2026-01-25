import type { PaymentRequest } from "../types/webhook";

export type MonitoredPayment = {
  id: string; // Session ID / Memo
  request: PaymentRequest;
  status: "pending" | "confirmed" | "failed";
  createdAt: number;
  expiresAt: number;
};

export interface PersistenceAdapter {
  init(): Promise<void>;
  savePayment(payment: MonitoredPayment): Promise<void>;
  getPendingPayments(): Promise<MonitoredPayment[]>;
  updatePaymentStatus(id: string, status: "confirmed" | "failed"): Promise<void>;
  deletePayment(id: string): Promise<void>;
  markHashProcessed(hash: string): Promise<void>;
  isHashProcessed(hash: string): Promise<boolean>;
  getCursor(): Promise<string>;
  saveCursor(cursor: string): Promise<void>;
  cleanup(now: number): Promise<void>;
}
