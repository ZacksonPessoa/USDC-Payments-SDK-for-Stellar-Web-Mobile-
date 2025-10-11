import type { WebhookPayload, WebhookConfig, WebhookResult } from "../types/webhook";

export class WebhookClient {
  private config: WebhookConfig;

  constructor(config: WebhookConfig) {
    this.config = {
      retryAttempts: 3,
      timeout: 5000,
      ...config
    };
  }

  /**
   * Envia um evento webhook com retry automático
   */
  async sendEvent(payload: WebhookPayload): Promise<WebhookResult> {
    const maxAttempts = this.config.retryAttempts!;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.sendSingleEvent(payload, attempt);
        
        if (result.success) {
          return result;
        }
        
        // Se não é o último attempt, aguarda antes de tentar novamente
        if (attempt < maxAttempts) {
          await this.delay(attempt * 1000); // Backoff exponencial
        }
      } catch (error) {
        if (attempt === maxAttempts) {
          return {
            success: false,
            attempt,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    }

    return {
      success: false,
      attempt: maxAttempts,
      error: "Max retry attempts exceeded"
    };
  }

  private async sendSingleEvent(payload: WebhookPayload, attempt: number): Promise<WebhookResult> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "USDC-Payments-SDK/0.1.0"
    };

    // Adiciona assinatura HMAC se secret estiver configurado
    if (this.config.secret) {
      const signature = this.createHmacSignature(JSON.stringify(payload));
      headers["X-Webhook-Signature"] = `sha256=${signature}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text();
      let parsedBody: any;
      
      try {
        parsedBody = JSON.parse(responseBody);
      } catch {
        parsedBody = responseBody;
      }

      return {
        success: response.ok,
        attempt,
        response: {
          status: response.status,
          statusText: response.statusText,
          body: parsedBody
        }
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private createHmacSignature(payload: string): string {
    // Implementação simplificada - em produção usar crypto.subtle
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config.secret!);
    const messageData = encoder.encode(payload);
    
    // Nota: Esta é uma implementação simplificada
    // Em produção, usar crypto.subtle.importKey() e crypto.subtle.sign()
    return btoa(String.fromCharCode(...messageData)); // Placeholder
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
