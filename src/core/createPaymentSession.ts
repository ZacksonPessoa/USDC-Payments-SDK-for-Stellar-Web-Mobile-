import { PaymentRequest, PaymentSession } from "../types";
import {
  Asset,
  Keypair,
  Operation,
  TransactionBuilder,
  Networks,
  Account,            
} from "stellar-sdk";
import * as StellarSDK from "stellar-sdk";

export async function createPaymentSession(req: PaymentRequest, sourcePublicKey?: string): Promise<PaymentSession> {
  if (!req.amount || !req.assetCode || !req.destination) {
    throw new Error("Invalid PaymentRequest");
  }
  
  // Para assets não-nativos, o issuer é obrigatório
  if (req.assetCode !== "XLM" && !req.issuer) {
    throw new Error("Invalid PaymentRequest: issuer required for non-native assets");
  }

  // usar a chave fornecida ou criar uma temporária
  const sourceKey = sourcePublicKey || Keypair.random().publicKey();

  // Carregar a conta real da testnet para obter o número de sequência correto
  let sourceAccount;
  if (sourcePublicKey) {
    const server = new StellarSDK.Horizon.Server("https://horizon-testnet.stellar.org");
    try {
      sourceAccount = await server.loadAccount(sourceKey);
    } catch (error) {
      // Se não conseguir carregar, usar sequência padrão
      sourceAccount = new Account(sourceKey, "1");
    }
  } else {
    sourceAccount = new Account(sourceKey, "1");
  }

  const asset = req.assetCode === "XLM" ? Asset.native() : new Asset(req.assetCode, req.issuer);
  const paymentOp = Operation.payment({
    destination: req.destination,
    asset,
    amount: req.amount.toFixed(2),
  });

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(paymentOp)
    .setTimeout(60)          
    .build();

  const xdr = tx.toXDR();

  const session: PaymentSession = {
    id: `session-${Date.now()}`,
    request: req,
    xdr,                  
  };

  // REMOVED: Insecure client-side webhook emission.
  // Webhooks should be triggered by the backend after monitoring the blockchain.

  return session;
}
