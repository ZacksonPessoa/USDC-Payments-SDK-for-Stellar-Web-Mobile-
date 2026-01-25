import React, { useState } from "react";
import { createPaymentSession } from "../core/createPaymentSession";
import type { PaymentRequest, WalletAdapter, NetworkName } from "../types";
import { PaymentStatusTracker } from "../core/paymentStatus";
import { WalletError } from "../core/errors";

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
  onStatusChange?: (status: string) => void;
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
  onStatusChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [statusTracker] = useState(() => new PaymentStatusTracker());

  const handleClick = async () => {
    try {
      setLoading(true);
      statusTracker.reset();

      // Step 1: Get public key
      statusTracker.setCreating();
      onStatusChange?.("creating");

      let publicKey: string;
      try {
        publicKey = source ?? (await wallet.getPublicKey());
      } catch (error) {
        throw new WalletError(
          "Failed to get public key from wallet",
          error
        );
      }

      // Step 2: Create payment session
      const req: PaymentRequest = {
        amount,
        assetCode,
        destination,
        memo,
      };
      if (assetCode.toUpperCase() !== "XLM") {
        if (!issuer) {
          throw new Error("issuer required for non-native assets");
        }
        req.issuer = issuer;
      }

      const session = await createPaymentSession(req, publicKey, network);

      // Step 3: Sign and submit
      statusTracker.setSigning();
      onStatusChange?.("signing");

      statusTracker.setSubmitting();
      onStatusChange?.("submitting");

      const { hash } = await wallet.signAndSubmit(session.xdr, network);

      statusTracker.setSubmitted(hash);
      onStatusChange?.("submitted");

      onSuccess?.(hash);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      const errorCode = (e as any)?.code;
      
      statusTracker.setFailed(errorMessage, errorCode);
      onStatusChange?.("failed");
      
      onError?.(e);
    } finally {
      setLoading(false);
    }
  };

  const buttonText = loading
    ? statusTracker.getStatus() === "creating"
      ? "Creating..."
      : statusTracker.getStatus() === "signing"
      ? "Signing..."
      : statusTracker.getStatus() === "submitting"
      ? "Submitting..."
      : "Processing..."
    : `${label} ${amount} ${assetCode}`;

  return (
    <button onClick={handleClick} disabled={loading}>
      {buttonText}
    </button>
  );
}
