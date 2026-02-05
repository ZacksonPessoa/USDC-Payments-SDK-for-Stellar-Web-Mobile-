import * as StellarSDK from "stellar-sdk";
import type { PaymentRequest, NetworkName } from "../types";
import {
  TransactionError,
  ValidationError,
  NetworkError,
  extractStellarError,
} from "./errors";
import { PaymentEventType, createEvent, emitJourneyEvent } from "../journey";

export interface SignAndSubmitOptions {
  network?: NetworkName;
  retries?: number;
  retryDelay?: number;
}

/**
 * Assina e envia uma transação XDR para a rede Stellar.
 * Recebe o XDR (base64) e a secret key (S...) do remetente.
 */
export async function signAndSubmit(
  xdr: string,
  secret: string,
  sessionId?: string,
  paymentRequest?: PaymentRequest,
  options: SignAndSubmitOptions = {}
): Promise<{ hash: string }> {
  const {
    network = "TESTNET",
    retries = 3,
    retryDelay = 1000,
  } = options;

  // Validate inputs
  if (!xdr || typeof xdr !== "string") {
    throw new ValidationError("XDR must be a non-empty string", "xdr");
  }

  if (!secret || typeof secret !== "string" || !secret.startsWith("S")) {
    throw new ValidationError(
      "Secret key must be a valid Stellar secret key (starts with S)",
      "secret"
    );
  }

  // Determine network configuration
  const networkPassphrase = network === "PUBLIC" 
    ? StellarSDK.Networks.PUBLIC 
    : StellarSDK.Networks.TESTNET;
  const horizonUrl = network === "PUBLIC"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";

  const server = new StellarSDK.Horizon.Server(horizonUrl);

  // Parse and validate XDR
  // Note: fromXDR can return Transaction or FeeBumpTransaction
  let tx: StellarSDK.Transaction | StellarSDK.FeeBumpTransaction;
  try {
    tx = StellarSDK.TransactionBuilder.fromXDR(xdr, networkPassphrase);
  } catch (error) {
    throw new ValidationError(
      "Invalid XDR format or network mismatch",
      "xdr",
      error
    );
  }

  const journeyData: Record<string, unknown> = {
    network: network,
    ...(paymentRequest && {
      amount: paymentRequest.amount,
      asset: paymentRequest.assetCode,
      to: paymentRequest.destination,
      from: undefined,
    }),
  };

  if (sessionId) {
    emitJourneyEvent(
      createEvent(sessionId, PaymentEventType.TX_SIGN_REQUESTED, journeyData)
    );
  }

  // Sign transaction
  let signer: StellarSDK.Keypair;
  try {
    signer = StellarSDK.Keypair.fromSecret(secret);
    tx.sign(signer);
  } catch (error) {
    throw new ValidationError(
      "Failed to sign transaction with provided secret key",
      "secret",
      error
    );
  }

  // Submit with retry logic
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await server.submitTransaction(tx);
      if (sessionId) {
        emitJourneyEvent(
          createEvent(sessionId, PaymentEventType.TX_SUBMITTED, {
            ...journeyData,
            txHash: res.hash,
          })
        );
      }
      return { hash: res.hash };
    } catch (err: any) {
      lastError = err;

      // Don't retry on certain errors (e.g., bad sequence, insufficient funds)
      const errorInfo = extractStellarError(err);
      const resultCode = errorInfo.resultCodes?.transaction;

      // These errors won't be fixed by retrying
      const nonRetryableErrors = [
        "tx_bad_seq",
        "tx_insufficient_balance",
        "tx_bad_auth",
        "tx_bad_auth_extra",
      ];

      if (resultCode && nonRetryableErrors.includes(resultCode)) {
        if (sessionId) {
          emitJourneyEvent(
            createEvent(
              sessionId,
              PaymentEventType.TX_FAILED,
              {
                ...journeyData,
                error: errorInfo.message,
                txHash: errorInfo.transactionHash,
              },
              "error"
            )
          );
        }
        throw new TransactionError(
          errorInfo.message,
          errorInfo.transactionHash,
          errorInfo.resultCodes,
          err
        );
      }

      // If not the last attempt, wait and retry
      if (attempt < retries) {
        const delay = retryDelay * attempt; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // All retries failed
  const errorInfo = extractStellarError(lastError!);
  if (sessionId) {
    emitJourneyEvent(
      createEvent(
        sessionId,
        PaymentEventType.TX_FAILED,
        {
          ...journeyData,
          error: errorInfo.message,
          txHash: errorInfo.transactionHash,
        },
        "error"
      )
    );
  }
  throw new TransactionError(
    `Transaction submission failed after ${retries} attempts: ${errorInfo.message}`,
    errorInfo.transactionHash,
    errorInfo.resultCodes,
    lastError
  );
}
