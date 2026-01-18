import type { WebhookPayload, WebhookConfig, WebhookResult } from "../types/webhook";
import { generateSignature } from "./crypto";

export class WebhookSender {
  private config: WebhookConfig;

  constructor(config: WebhookConfig) {
    this.config = {
      retryAttempts: 3,
      timeout: 5000,
      ...config
    };
  }

  async sendEvent(payload: WebhookPayload): Promise<WebhookResult> {
    const maxAttempts = this.config.retryAttempts!;
    const payloadString = JSON.stringify(payload);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.sendSingleEvent(payloadString, attempt);
        if (result.success) return result;

        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, attempt * 1000));
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

    return { success: false, attempt: maxAttempts, error: "Max retries exceeded" };
  }

  private async sendSingleEvent(payloadString: string, attempt: number): Promise<WebhookResult> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "USDC-Payments-SDK/Server"
    };

    if (this.config.secret) {
      headers["X-Signature"] = generateSignature(payloadString, this.config.secret);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.url, {
        method: "POST",
        headers,
        body: payloadString,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      return {
        success: response.ok,
        attempt,
        response: {
          status: response.status,
          statusText: response.statusText
        }
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
