/**
 * @deprecated This class was removed for security reasons.
 */
export class WebhookClient {
  constructor(config: any) {}
  async sendEvent(payload: any): Promise<any> {
    return { success: false, error: "Client-side webhooks disabled." };
  }
}
