import * as StellarSDK from "stellar-sdk";

/**
 * Assina e envia uma transação XDR para a Testnet.
 * Recebe o XDR (base64) e a secret key (S...) do remetente.
 */
export async function signAndSubmit(
  xdr: string,
  secret: string
): Promise<{ hash: string }> {
  try {
    // 1) Horizon Testnet
    const server = new StellarSDK.Horizon.Server("https://horizon-testnet.stellar.org");

    // 2) Recria a transação a partir do XDR (SDK v13)
    const tx = StellarSDK.TransactionBuilder.fromXDR(xdr, StellarSDK.Networks.TESTNET);

    // 3) Assina localmente
    const signer = StellarSDK.Keypair.fromSecret(secret);
    tx.sign(signer);

    // 4) Envia
    const res = await server.submitTransaction(tx);
    console.log("Transaction submitted:", res.hash);
    return { hash: res.hash };
  } catch (err: any) {
    console.error("Error submitting transaction:", err?.response?.data || err);
    throw new Error(err?.response?.data?.extras?.result_codes?.transaction || "Submit failed");
  }
}
