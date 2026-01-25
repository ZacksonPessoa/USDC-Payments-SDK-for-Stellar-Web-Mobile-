/**
 * Custom error classes for better error handling and debugging
 */

export class PaymentSDKError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class InvalidPaymentRequestError extends PaymentSDKError {
  constructor(message: string, cause?: unknown) {
    super(message, "INVALID_PAYMENT_REQUEST", cause);
  }
}

export class TransactionError extends PaymentSDKError {
  constructor(
    message: string,
    public readonly transactionHash?: string,
    public readonly resultCodes?: {
      transaction?: string;
      operations?: string[];
    },
    cause?: unknown
  ) {
    super(message, "TRANSACTION_ERROR", cause);
  }
}

export class NetworkError extends PaymentSDKError {
  constructor(message: string, cause?: unknown) {
    super(message, "NETWORK_ERROR", cause);
  }
}

export class WalletError extends PaymentSDKError {
  constructor(message: string, cause?: unknown) {
    super(message, "WALLET_ERROR", cause);
  }
}

export class ValidationError extends PaymentSDKError {
  constructor(message: string, public readonly field?: string, cause?: unknown) {
    super(message, "VALIDATION_ERROR", cause);
  }
}

export class TimeoutError extends PaymentSDKError {
  constructor(message: string, cause?: unknown) {
    super(message, "TIMEOUT_ERROR", cause);
  }
}

/**
 * Helper function to extract error information from Stellar SDK errors
 */
export function extractStellarError(error: unknown): {
  message: string;
  resultCodes?: {
    transaction?: string;
    operations?: string[];
  };
  transactionHash?: string;
} {
  const err = error as any;
  
  if (err?.response?.data) {
    const data = err.response.data;
    return {
      message: data.detail || data.title || err.message || "Unknown Stellar error",
      resultCodes: data.extras?.result_codes,
      transactionHash: data.extras?.result_xdr ? undefined : data.hash,
    };
  }
  
  return {
    message: err?.message || String(error),
  };
}
