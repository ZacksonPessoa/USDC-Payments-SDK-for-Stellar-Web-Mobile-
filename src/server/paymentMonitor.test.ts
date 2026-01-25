import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PaymentMonitor } from "./paymentMonitor";
import type { PaymentRequest, WebhookConfig } from "../types/webhook";
import * as StellarSDK from "stellar-sdk";

// Mock Stellar SDK
vi.mock("stellar-sdk", async () => {
  const actual = await vi.importActual("stellar-sdk");
  return {
    ...actual,
    Horizon: {
      Server: vi.fn().mockImplementation(() => ({
        payments: vi.fn().mockReturnValue({
          forAccount: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                call: vi.fn(),
              }),
            }),
          }),
        }),
      })),
    },
  };
});

// Mock WebhookSender
vi.mock("./webhookSender", () => ({
  WebhookSender: vi.fn().mockImplementation(() => ({
    sendEvent: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

describe("PaymentMonitor", () => {
  const mockWebhookConfig: WebhookConfig = {
    url: "https://example.com/webhook",
    secret: "test-secret",
  };

  const mockPaymentRequest: PaymentRequest = {
    amount: 50,
    assetCode: "USDC",
    issuer: "GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL",
    destination: "GDESTINATIONADDRESS123456789012345678901234567890",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create a PaymentMonitor instance", () => {
    const monitor = new PaymentMonitor(
      "TESTNET",
      "GACCOUNT1234567890123456789012345678901234567890123456",
      mockWebhookConfig
    );

    expect(monitor).toBeInstanceOf(PaymentMonitor);
  });

  it("should register a payment to monitor", () => {
    const monitor = new PaymentMonitor(
      "TESTNET",
      "GACCOUNT1234567890123456789012345678901234567890123456",
      mockWebhookConfig
    );

    monitor.registerPayment("session-123", mockPaymentRequest);

    // Payment should be registered (we can't directly access private members,
    // but we can test behavior)
    expect(() => monitor.registerPayment("session-123", mockPaymentRequest)).not.toThrow();
  });

  it("should throw error when registering payment without session ID", () => {
    const monitor = new PaymentMonitor(
      "TESTNET",
      "GACCOUNT1234567890123456789012345678901234567890123456",
      mockWebhookConfig
    );

    expect(() => monitor.registerPayment("", mockPaymentRequest)).toThrow(
      "Session ID is required"
    );
  });

  it("should use custom timeout when provided", () => {
    const monitor = new PaymentMonitor(
      "TESTNET",
      "GACCOUNT1234567890123456789012345678901234567890123456",
      mockWebhookConfig,
      { timeoutMinutes: 30 }
    );

    expect(monitor).toBeInstanceOf(PaymentMonitor);
  });

  it("should use PUBLIC network when specified", () => {
    const monitor = new PaymentMonitor(
      "PUBLIC",
      "GACCOUNT1234567890123456789012345678901234567890123456",
      mockWebhookConfig
    );

    expect(monitor).toBeInstanceOf(PaymentMonitor);
    expect(StellarSDK.Horizon.Server).toHaveBeenCalledWith(
      "https://horizon.stellar.org"
    );
  });

  it("should use TESTNET network by default", () => {
    const monitor = new PaymentMonitor(
      "TESTNET",
      "GACCOUNT1234567890123456789012345678901234567890123456",
      mockWebhookConfig
    );

    expect(StellarSDK.Horizon.Server).toHaveBeenCalledWith(
      "https://horizon-testnet.stellar.org"
    );
  });

  it("should start and stop monitoring", async () => {
    const monitor = new PaymentMonitor(
      "TESTNET",
      "GACCOUNT1234567890123456789012345678901234567890123456",
      mockWebhookConfig
    );

    const mockCall = vi.fn().mockResolvedValue({
      records: [],
    });

    (StellarSDK.Horizon.Server as any).mockImplementation(() => ({
      payments: vi.fn().mockReturnValue({
        forAccount: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              call: mockCall,
            }),
          }),
        }),
      }),
    }));

    monitor.registerPayment("session-123", mockPaymentRequest);

    // Start monitoring (non-blocking)
    const startPromise = monitor.start(10); // 10ms interval for testing

    // Stop immediately
    monitor.stop();

    // Wait a bit to ensure it stops
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(monitor).toBeInstanceOf(PaymentMonitor);
  });

  it("should not start monitoring if already polling", async () => {
    const monitor = new PaymentMonitor(
      "TESTNET",
      "GACCOUNT1234567890123456789012345678901234567890123456",
      mockWebhookConfig
    );

    const mockCall = vi.fn().mockResolvedValue({
      records: [],
    });

    (StellarSDK.Horizon.Server as any).mockImplementation(() => ({
      payments: vi.fn().mockReturnValue({
        forAccount: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              call: mockCall,
            }),
          }),
        }),
      }),
    }));

    monitor.start(10);
    monitor.start(10); // Should not start again

    monitor.stop();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
});
