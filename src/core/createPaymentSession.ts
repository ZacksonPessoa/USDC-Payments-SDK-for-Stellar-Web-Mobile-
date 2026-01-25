import { PaymentRequest, PaymentSession, NetworkName } from "../types";
import {
  Asset,
  Keypair,
  Operation,
  TransactionBuilder,
  Networks,
  Account,            
} from "stellar-sdk";
import * as StellarSDK from "stellar-sdk";
import {
  InvalidPaymentRequestError,
  ValidationError,
  NetworkError,
} from "./errors";

export async function createPaymentSession(
  req: PaymentRequest,
  sourcePublicKey?: string,
  network: NetworkName = "TESTNET"
): Promise<PaymentSession> {
  // Validation
  if (req.amount === undefined || req.amount === null || !req.assetCode || !req.destination) {
    throw new InvalidPaymentRequestError(
      "PaymentRequest must include amount, assetCode, and destination"
    );
  }

  if (req.amount <= 0) {
    throw new ValidationError(
      "Amount must be greater than zero",
      "amount"
    );
  }

  if (typeof req.amount !== "number" || !isFinite(req.amount)) {
    throw new ValidationError(
      "Amount must be a valid number",
      "amount"
    );
  }

  // Validate destination address format (basic Stellar address check)
  if (!req.destination.startsWith("G") || req.destination.length !== 56) {
    throw new ValidationError(
      "Destination must be a valid Stellar address (starts with G, 56 characters)",
      "destination"
    );
  }

  // Para assets não-nativos, o issuer é obrigatório
  if (req.assetCode !== "XLM" && !req.issuer) {
    throw new InvalidPaymentRequestError(
      "Issuer is required for non-native assets"
    );
  }

  // Validate issuer format if provided
  if (req.issuer && (!req.issuer.startsWith("G") || req.issuer.length !== 56)) {
    throw new ValidationError(
      "Issuer must be a valid Stellar address (starts with G, 56 characters)",
      "issuer"
    );
  }

  // Validate source key format if provided
  if (sourcePublicKey && (!sourcePublicKey.startsWith("G") || sourcePublicKey.length !== 56)) {
    throw new ValidationError(
      "Source public key must be a valid Stellar address (starts with G, 56 characters)",
      "sourcePublicKey"
    );
  }

  // usar a chave fornecida ou criar uma temporária
  const sourceKey = sourcePublicKey || Keypair.random().publicKey();

  // Determine network configuration
  const networkPassphrase = network === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET;
  const horizonUrl = network === "PUBLIC"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";

  // Carregar a conta real para obter o número de sequência correto
  let sourceAccount;
  if (sourcePublicKey) {
    const server = new StellarSDK.Horizon.Server(horizonUrl);
    try {
      sourceAccount = await server.loadAccount(sourceKey);
    } catch (error) {
      // Se não conseguir carregar, usar sequência padrão
      // This is acceptable for new accounts or when account doesn't exist yet
      sourceAccount = new Account(sourceKey, "1");
    }
  } else {
    sourceAccount = new Account(sourceKey, "1");
  }

  // Create asset
  let asset: Asset;
  try {
    asset = req.assetCode === "XLM" 
      ? Asset.native() 
      : new Asset(req.assetCode, req.issuer!);
  } catch (error) {
    throw new InvalidPaymentRequestError(
      `Invalid asset: ${req.assetCode}`,
      error
    );
  }

  // Create payment operation
  let paymentOp;
  try {
    paymentOp = Operation.payment({
      destination: req.destination,
      asset,
      amount: req.amount.toFixed(7), // Stellar supports up to 7 decimal places
    });
  } catch (error) {
    throw new InvalidPaymentRequestError(
      "Failed to create payment operation",
      error
    );
  }

  const sessionId = `session-${Date.now()}`;
  const sessionHash = StellarSDK.hash(Buffer.from(sessionId));

  // Build transaction
  let tx;
  try {
    tx = new TransactionBuilder(sourceAccount, {
      fee: "100",
      networkPassphrase,
    })
      .addOperation(paymentOp)
      .addMemo(StellarSDK.Memo.hash(sessionHash))
      .setTimeout(60)
      .build();
  } catch (error) {
    throw new InvalidPaymentRequestError(
      "Failed to build transaction",
      error
    );
  }

  const xdr = tx.toXDR();

  const session: PaymentSession = {
    id: sessionId,
    request: req,
    xdr,                  
  };

  // REMOVED: Insecure client-side webhook emission.
  // Webhooks should be triggered by the backend after monitoring the blockchain.

  return session;
}
