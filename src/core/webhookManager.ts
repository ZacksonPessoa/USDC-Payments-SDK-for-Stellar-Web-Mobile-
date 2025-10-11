import { WebhookClient } from "./webhookClient";
import type { WebhookPayload, WebhookConfig, WebhookEventType, PaymentRequest } from "../types/webhook";
import type { PaymentSession } from "../types";

export class WebhookManager {
  private clients: Map<string, WebhookClient> = new Map();
  private eventQueue: WebhookPayload[] = [];
  private isProcessing = false;

  /**
   * Registra um webhook para eventos específicos
   */
  registerWebhook(
    name: string, 
    config: WebhookConfig, 
    eventTypes?: WebhookEventType[]
  ): void {
    this.clients.set(name, new WebhookClient(config));
  }

  /**
   * Remove um webhook registrado
   */
  unregisterWebhook(name: string): void {
    this.clients.delete(name);
  }

  /**
   * Emite um evento para todos os webhooks registrados
   */
  async emitEvent(
    type: WebhookEventType,
    sessionId: string,
    paymentRequest: PaymentRequest,
    metadata?: Record<string, any>
  ): Promise<void> {
    const payload: WebhookPayload = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date().toISOString(),
      sessionId,
      paymentRequest,
      metadata
    };

    // Adiciona à fila para processamento assíncrono
    this.eventQueue.push(payload);
    
    // Processa a fila se não estiver processando
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Emite evento quando uma sessão de pagamento é criada
   */
  async emitPaymentCreated(session: PaymentSession): Promise<void> {
    await this.emitEvent("payment.created", session.id, session.request, {
      xdrLength: session.xdr.length
    });
  }

  /**
   * Emite evento quando uma transação é enviada
   */
  async emitPaymentSubmitted(sessionId: string, paymentRequest: PaymentRequest, transactionHash: string): Promise<void> {
    await this.emitEvent("payment.submitted", sessionId, paymentRequest, {
      transactionHash
    });
  }

  /**
   * Emite evento quando uma transação é confirmada
   */
  async emitPaymentConfirmed(sessionId: string, paymentRequest: PaymentRequest, transactionHash: string): Promise<void> {
    await this.emitEvent("payment.confirmed", sessionId, paymentRequest, {
      transactionHash,
      confirmedAt: new Date().toISOString()
    });
  }

  /**
   * Emite evento quando uma transação falha
   */
  async emitPaymentFailed(sessionId: string, paymentRequest: PaymentRequest, error: string): Promise<void> {
    await this.emitEvent("payment.failed", sessionId, paymentRequest, {
      error,
      failedAt: new Date().toISOString()
    });
  }

  /**
   * Processa a fila de eventos de forma assíncrona
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const payload = this.eventQueue.shift()!;
      
      // Envia para todos os webhooks registrados
      const promises = Array.from(this.clients.values()).map(client => 
        client.sendEvent(payload).catch(error => {
          console.error("Webhook delivery failed:", error);
          return { success: false, error: error.message };
        })
      );

      await Promise.allSettled(promises);
    }

    this.isProcessing = false;
  }

  /**
   * Retorna estatísticas dos webhooks
   */
  getStats(): { registeredWebhooks: number; queuedEvents: number } {
    return {
      registeredWebhooks: this.clients.size,
      queuedEvents: this.eventQueue.length
    };
  }
}
