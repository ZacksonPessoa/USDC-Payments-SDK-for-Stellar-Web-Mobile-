import type { WebhookPayload, WebhookConfig, WebhookEventType, PaymentRequest } from "../types/webhook";
import type { PaymentSession } from "../types";

/**
 * @deprecated This class was removed for security reasons.
 * Client-side webhooks are insecure. Use server-side blockchain monitoring instead.
 */
export class WebhookManager {
  constructor() {
    console.warn("WebhookManager is deprecated and disabled. Please implement server-side verification.");
  }

  registerWebhook(name: string, config: WebhookConfig, eventTypes?: WebhookEventType[]): void {}
  unregisterWebhook(name: string): void {}
  async emitEvent(type: WebhookEventType, sessionId: string, req: PaymentRequest, metadata?: any): Promise<void> {}
  async emitPaymentCreated(session: PaymentSession): Promise<void> {}
  async emitPaymentSubmitted(sid: string, req: PaymentRequest, txHash: string): Promise<void> {}
  async emitPaymentConfirmed(sid: string, req: PaymentRequest, txHash: string): Promise<void> {}
  async emitPaymentFailed(sid: string, req: PaymentRequest, error: string): Promise<void> {}
  getStats() { return { registeredWebhooks: 0, queuedEvents: 0 }; }
}
