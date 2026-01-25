import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebhookSender } from "./webhookSender";
import type { WebhookPayload, WebhookConfig } from "../types/webhook";
import { generateSignature } from "./crypto";

// Mock crypto module
vi.mock("./crypto", () => ({
  generateSignature: vi.fn().mockReturnValue("mock-signature"),
}));

describe("WebhookSender", () => {
  const mockConfig: WebhookConfig = {
    url: "https://example.com/webhook",
    secret: "test-secret",
    retryAttempts: 3,
    timeout: 5000,
  };

  const mockPayload: WebhookPayload = {
    id: "evt_123",
    type: "payment.confirmed",
    timestamp: new Date().toISOString(),
    sessionId: "session-123",
    paymentRequest: {
      amount: 50,
      assetCode: "USDC",
      issuer: "GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL",
      destination: "GDESTINATIONADDRESS123456789012345678901234567890",
    },
    transactionHash: "tx-hash-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should create a WebhookSender instance", () => {
    const sender = new WebhookSender(mockConfig);
    expect(sender).toBeInstanceOf(WebhookSender);
  });

  it("should use default retryAttempts and timeout if not provided", () => {
    const config: WebhookConfig = {
      url: "https://example.com/webhook",
    };
    const sender = new WebhookSender(config);
    expect(sender).toBeInstanceOf(WebhookSender);
  });

  it("should successfully send a webhook event", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });

    const sender = new WebhookSender(mockConfig);
    const result = await sender.sendEvent(mockPayload);

    expect(result.success).toBe(true);
    expect(result.attempt).toBe(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(generateSignature).toHaveBeenCalled();
  });

  it("should include signature header when secret is provided", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });

    const sender = new WebhookSender(mockConfig);
    await sender.sendEvent(mockPayload);

    const callArgs = (global.fetch as any).mock.calls[0];
    const headers = callArgs[1].headers;

    expect(headers["X-Signature"]).toBe("mock-signature");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("should not include signature header when secret is not provided", async () => {
    const configWithoutSecret: WebhookConfig = {
      url: "https://example.com/webhook",
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });

    const sender = new WebhookSender(configWithoutSecret);
    await sender.sendEvent(mockPayload);

    const callArgs = (global.fetch as any).mock.calls[0];
    const headers = callArgs[1].headers;

    expect(headers["X-Signature"]).toBeUndefined();
  });

  it("should retry on failure", async () => {
    (global.fetch as any)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      });

    const sender = new WebhookSender(mockConfig);
    const result = await sender.sendEvent(mockPayload);

    expect(result.success).toBe(true);
    expect(result.attempt).toBe(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("should fail after max retries", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network error"));

    const sender = new WebhookSender(mockConfig);
    const result = await sender.sendEvent(mockPayload);

    expect(result.success).toBe(false);
    expect(result.attempt).toBe(3);
    expect(result.error).toBeDefined();
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("should handle timeout", async () => {
    const configWithShortTimeout: WebhookConfig = {
      ...mockConfig,
      timeout: 10,
      retryAttempts: 1, // Only one attempt to avoid waiting
    };

    // Mock fetch to simulate a slow response that will timeout
    // The AbortController will abort after 10ms, causing fetch to throw
    (global.fetch as any).mockImplementation(
      (url: string, options: any) => {
        return new Promise((resolve, reject) => {
          // If signal is aborted, reject with AbortError
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new Error('The operation was aborted'));
            });
          }
          // Otherwise resolve after delay (but timeout will abort first)
          setTimeout(() => resolve({ ok: true, status: 200 }), 100);
        });
      }
    );

    const sender = new WebhookSender(configWithShortTimeout);
    const result = await sender.sendEvent(mockPayload);

    // Timeout should cause abort which throws an error (AbortError)
    // The error is caught and returned in the result
    expect(result.success).toBe(false);
    expect(result.attempt).toBe(1);
    // Error should be defined (from abort)
    expect(result.error).toBeDefined();
  });

  it("should handle non-OK responses", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const sender = new WebhookSender({ ...mockConfig, retryAttempts: 1 });
    const result = await sender.sendEvent(mockPayload);

    expect(result.success).toBe(false);
    expect(result.response).toBeDefined();
    expect(result.response?.status).toBe(500);
    expect(result.response?.statusText).toBe("Internal Server Error");
  });
});
