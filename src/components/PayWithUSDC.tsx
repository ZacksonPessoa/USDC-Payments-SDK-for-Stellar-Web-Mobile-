import React, { useState } from "react";
import { createPaymentSession } from "../core/createPaymentSession";
import { signAndSubmit } from "../core/signAndSubmit";

type Props = {
  amount: number;
  destination: string;         // G... destino
  source: string;              // G... da conta que vai pagar
  getSecret: () => Promise<string>; // função que retorna a S... (apenas DEV!)
  assetCode?: string;          // default "XLM"
  issuer?: string;             // se não for XLM
  memo?: string;
  label?: string;
  onSuccess?: (hash: string) => void;
  onError?: (e: unknown) => void;
};

export default function PayWithUSDC({
  amount,
  destination,
  source,
  getSecret,
  assetCode = "XLM",
  issuer,
  memo,
  label = "Pay",
  onSuccess,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);

      const session = await createPaymentSession(
        {
          amount,
          assetCode,
          issuer,
          destination,
          memo,
        },
        source // usa como sourcePublicKey para pegar o sequence
      );

      const secret = await getSecret(); // ⚠️ DEV ONLY
      const { hash } = await signAndSubmit(session.xdr, secret);

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
