import React, { useState } from "react";
import { createPaymentSession } from "../core/createPaymentSession";
import type { PaymentRequest, WalletAdapter, NetworkName } from "../types";

type Props = {
  amount: number;
  destination: string;             // G...
  assetCode?: string;              // "XLM" (default) ou "USDC"
  issuer?: string;                 // se non-native
  memo?: string;
  network?: NetworkName;           // default "TESTNET"
  wallet: WalletAdapter;           // 👈 FreighterWallet
  source?: string;                 // opcional; se não vier, pega do wallet
  label?: string;
  onSuccess?: (hash: string) => void;
  onError?: (e: unknown) => void;
};

export default function PayWithUSDC({
  amount,
  destination,
  assetCode = "XLM",
  issuer,
  memo,
  network = "TESTNET",
  wallet,
  source,
  label = "Pay",
  onSuccess,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);

      const publicKey = source ?? (await wallet.getPublicKey());

      const req: PaymentRequest = {
        amount,
        assetCode,
        destination,
        memo,
      };
      if (assetCode.toUpperCase() !== "XLM") {
        if (!issuer) throw new Error("issuer required for non-native assets");
        req.issuer = issuer;
      }

      const session = await createPaymentSession(req, publicKey);
      const { hash } = await wallet.signAndSubmit(session.xdr, network);

      onSuccess?.(hash);
    } catch (e) {
      onError?.(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? "Processing..." : `${label} ${amount} ${assetCode}`}
    </button>
  );
}
