import { describe, it, expect } from "vitest";
import { createPaymentSession } from "./createPaymentSession";
import {
  InvalidPaymentRequestError,
  ValidationError,
} from "./errors";
import type { PaymentRequest } from "../types";

describe("createPaymentSession", () => {
  // Valid Stellar addresses (56 characters, starting with G)
  const validDestination = "GDESTINATIONADDRESS123456789012345678901234567890";
  const validIssuer = "GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL";
  const validSource = "GSOURCEADDRESS123456789012345678901234567890";

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
