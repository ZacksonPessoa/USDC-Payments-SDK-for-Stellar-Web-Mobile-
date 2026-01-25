import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPaymentSession } from "./createPaymentSession";
import {
  InvalidPaymentRequestError,
  ValidationError,
} from "./errors";
import type { PaymentRequest } from "../types";
import * as StellarSDK from "stellar-sdk";

// Mock Stellar SDK
vi.mock("stellar-sdk", async () => {
  const actual = await vi.importActual("stellar-sdk");
  
  // Mock Operation.payment
  const mockPaymentOperation = {
    type: "payment",
    destination: "",
    asset: null,
    amount: "",
  };

  // Mock Transaction with toXDR method
  const mockTransaction = {
    toXDR: vi.fn().mockReturnValue("AAAAAgAAAABiXz1Zw/ieZ1qM2FvAvKmH2R5zu3tqjLpagnrn8r5GQwAAAGQAAAAAAAAAAQAAAAEAAAAAXh3LgAAAAAAAAAAA"),
  };

  // Mock TransactionBuilder
  const mockTransactionBuilder = {
    addOperation: vi.fn().mockReturnThis(),
    addMemo: vi.fn().mockReturnThis(),
    setTimeout: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue(mockTransaction),
  };

  return {
    ...actual,
    Horizon: {
      Server: vi.fn().mockImplementation(() => ({
        loadAccount: vi.fn().mockResolvedValue({
          accountId: () => "GACCOUNT1234567890123456789012345678901234567890123456",
          sequenceNumber: () => "123456",
        }),
      })),
    },
    Operation: {
      ...actual.Operation,
      payment: vi.fn().mockReturnValue(mockPaymentOperation),
    },
    TransactionBuilder: vi.fn().mockImplementation(() => mockTransactionBuilder),
    Asset: Object.assign(
      vi.fn().mockImplementation((code, issuer) => {
        if (code === "XLM" || !issuer) {
          return { code: "XLM", issuer: undefined, isNative: () => true };
        }
        return { code, issuer, isNative: () => false };
      }),
      {
        native: vi.fn().mockReturnValue({ 
          code: "XLM", 
          issuer: undefined, 
          isNative: () => true 
        }),
      }
    ),
    Keypair: {
      ...actual.Keypair,
      random: vi.fn().mockReturnValue({
        publicKey: () => "GRANDOMKEY1234567890123456789012345678901234567890123456",
      }),
    },
    Account: vi.fn().mockImplementation((publicKey, sequence) => ({
      accountId: () => publicKey,
      sequenceNumber: () => sequence,
    })),
    Networks: actual.Networks,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPaymentSession", () => {
  // Valid Stellar addresses (56 characters, starting with G)
  // Using real Stellar address format: base32 encoded, 56 chars
  const validDestination = "GDESTINATIONADDRESS1234567890123456789012345678901234ABC";
  const validIssuer = "GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL";
  const validSource = "GSOURCEADDRESS123456789012345678901234567890123456789012";

  const validRequest: PaymentRequest = {
    amount: 10,
    assetCode: "XLM",
    destination: validDestination,
  };

  const validUSDCRequest: PaymentRequest = {
    amount: 50,
    assetCode: "USDC",
    issuer: validIssuer,
    destination: validDestination,
  };

  it("should create a valid payment session for XLM", async () => {
    const session = await createPaymentSession(validRequest);

    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.request).toEqual(validRequest);
    expect(session.xdr).toBeDefined();
    expect(typeof session.xdr).toBe("string");
    expect(session.xdr.length).toBeGreaterThan(0);
  });

  it("should create a valid payment session for USDC", async () => {
    const session = await createPaymentSession(validUSDCRequest);

    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.request).toEqual(validUSDCRequest);
    expect(session.xdr).toBeDefined();
  });

  it("should throw InvalidPaymentRequestError when amount is missing", async () => {
    const invalidRequest = { ...validRequest };
    delete (invalidRequest as any).amount;

    await expect(createPaymentSession(invalidRequest)).rejects.toThrow(
      InvalidPaymentRequestError
    );
  });

  it("should throw ValidationError when amount is zero", async () => {
    const invalidRequest = { ...validRequest, amount: 0 };

    await expect(createPaymentSession(invalidRequest)).rejects.toThrow(
      ValidationError
    );
    await expect(createPaymentSession(invalidRequest)).rejects.toThrow(
      "Amount must be greater than zero"
    );
  });

  it("should throw ValidationError when amount is negative", async () => {
    const invalidRequest = { ...validRequest, amount: -10 };

    await expect(createPaymentSession(invalidRequest)).rejects.toThrow(
      ValidationError
    );
  });

  it("should throw InvalidPaymentRequestError when issuer is missing for non-native asset", async () => {
    const invalidRequest = {
      ...validRequest,
      assetCode: "USDC",
      issuer: undefined,
    };

    await expect(createPaymentSession(invalidRequest)).rejects.toThrow(
      InvalidPaymentRequestError
    );
    await expect(createPaymentSession(invalidRequest)).rejects.toThrow(
      "Issuer is required"
    );
  });

  it("should throw ValidationError for invalid destination address", async () => {
    const invalidRequest = { ...validRequest, destination: "INVALID" };

    await expect(createPaymentSession(invalidRequest)).rejects.toThrow(
      ValidationError
    );
  });

  it("should throw ValidationError for invalid issuer address", async () => {
    const invalidRequest = {
      ...validUSDCRequest,
      issuer: "INVALID",
    };

    await expect(createPaymentSession(invalidRequest)).rejects.toThrow(
      ValidationError
    );
  });

  it("should accept a source public key", async () => {
    const session = await createPaymentSession(validRequest, validSource);

    expect(session).toBeDefined();
    expect(session.xdr).toBeDefined();
  });

  it("should throw ValidationError for invalid source public key", async () => {
    const invalidSourceKey = "INVALID";

    await expect(
      createPaymentSession(validRequest, invalidSourceKey)
    ).rejects.toThrow(ValidationError);
  });

  it("should work with PUBLIC network", async () => {
    const session = await createPaymentSession(validRequest, undefined, "PUBLIC");

    expect(session).toBeDefined();
    expect(session.xdr).toBeDefined();
  });

  it("should include memo in session request", async () => {
    const requestWithMemo = { ...validRequest, memo: "ORDER_123" };
    const session = await createPaymentSession(requestWithMemo);

    expect(session.request.memo).toBe("ORDER_123");
  });
});
