import { describe, it, expect, vi, beforeEach } from "vitest";
import { signAndSubmit } from "./signAndSubmit";
import {
  ValidationError,
  TransactionError,
} from "./errors";
import * as StellarSDK from "stellar-sdk";

// Mock Stellar SDK
vi.mock("stellar-sdk", async () => {
  const actual = await vi.importActual("stellar-sdk");
  return {
    ...actual,
    Horizon: {
      Server: vi.fn().mockImplementation(() => ({
        submitTransaction: vi.fn(),
      })),
    },
  };
});

describe("signAndSubmit", () => {
  const validXDR = "AAAAAgAAAABiXz1Zw/ieZ1qM2FvAvKmH2R5zu3tqjLpagnrn8r5GQwAAAGQAAAAAAAAAAQAAAAEAAAAAXh3LgAAAAAAAAAAA";
  const validSecret = "SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw ValidationError for empty XDR", async () => {
    await expect(signAndSubmit("", validSecret)).rejects.toThrow(ValidationError);
  });

  it("should throw ValidationError for invalid secret key", async () => {
    await expect(signAndSubmit(validXDR, "INVALID")).rejects.toThrow(ValidationError);
    await expect(signAndSubmit(validXDR, "")).rejects.toThrow(ValidationError);
  });

  it("should throw ValidationError for invalid XDR format", async () => {
    await expect(signAndSubmit("invalid-xdr", validSecret)).rejects.toThrow(
      ValidationError
    );
  });

  it("should successfully submit a valid transaction", async () => {
    const mockServer = {
      submitTransaction: vi.fn().mockResolvedValue({
        hash: "test-hash-123",
      }),
    };

    (StellarSDK.Horizon.Server as any).mockImplementation(() => mockServer);

    // Mock TransactionBuilder.fromXDR
    const mockTx = {
      sign: vi.fn(),
    };
    const mockKeypair = {
      sign: vi.fn(),
    };
    
    vi.spyOn(StellarSDK.TransactionBuilder, "fromXDR").mockReturnValue(mockTx as any);
    vi.spyOn(StellarSDK.Keypair, "fromSecret").mockReturnValue(mockKeypair as any);

    const result = await signAndSubmit(validXDR, validSecret);

    expect(result.hash).toBe("test-hash-123");
    expect(mockServer.submitTransaction).toHaveBeenCalled();
    expect(mockTx.sign).toHaveBeenCalled();
  });

  it("should retry on network errors", async () => {
    const mockServer = {
      submitTransaction: vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ hash: "test-hash-123" }),
    };

    (StellarSDK.Horizon.Server as any).mockImplementation(() => mockServer);

    const mockTx = {
      sign: vi.fn(),
    };
    const mockKeypair = {
      sign: vi.fn(),
    };
    
    vi.spyOn(StellarSDK.TransactionBuilder, "fromXDR").mockReturnValue(mockTx as any);
    vi.spyOn(StellarSDK.Keypair, "fromSecret").mockReturnValue(mockKeypair as any);

    const result = await signAndSubmit(validXDR, validSecret, undefined, undefined, {
      retries: 2,
      retryDelay: 10,
    });

    expect(result.hash).toBe("test-hash-123");
    expect(mockServer.submitTransaction).toHaveBeenCalledTimes(2);
  });

  it("should not retry on non-retryable errors", async () => {
    const mockServer = {
      submitTransaction: vi.fn().mockRejectedValue({
        response: {
          data: {
            extras: {
              result_codes: {
                transaction: "tx_insufficient_balance",
              },
            },
          },
        },
      }),
    };

    (StellarSDK.Horizon.Server as any).mockImplementation(() => mockServer);

    const mockTx = {
      sign: vi.fn(),
    };
    const mockKeypair = {
      sign: vi.fn(),
    };
    
    vi.spyOn(StellarSDK.TransactionBuilder, "fromXDR").mockReturnValue(mockTx as any);
    vi.spyOn(StellarSDK.Keypair, "fromSecret").mockReturnValue(mockKeypair as any);

    await expect(signAndSubmit(validXDR, validSecret)).rejects.toThrow(TransactionError);
    expect(mockServer.submitTransaction).toHaveBeenCalledTimes(1);
  });

  it("should work with PUBLIC network", async () => {
    const mockServer = {
      submitTransaction: vi.fn().mockResolvedValue({
        hash: "test-hash-123",
      }),
    };

    (StellarSDK.Horizon.Server as any).mockImplementation(() => mockServer);

    const mockTx = {
      sign: vi.fn(),
    };
    const mockKeypair = {
      sign: vi.fn(),
    };
    
    vi.spyOn(StellarSDK.TransactionBuilder, "fromXDR").mockReturnValue(mockTx as any);
    vi.spyOn(StellarSDK.Keypair, "fromSecret").mockReturnValue(mockKeypair as any);

    await signAndSubmit(validXDR, validSecret, undefined, undefined, {
      network: "PUBLIC",
    });

    expect(StellarSDK.Horizon.Server).toHaveBeenCalledWith(
      "https://horizon.stellar.org"
    );
  });
});
