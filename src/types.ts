export type PaymentRequest = {
    amount: number;              // ex.: 10
    assetCode: string;           // ex.: "USDC"
    issuer?: string;             // ex.: "GA...ISSUER" (opcional para XLM)
    destination: string;         // conta de destino
    memo?: string;
  };
  
  export type PaymentSession = {
    id: string;                  // "dev-session-..." (placeholder)
    request: PaymentRequest;
    xdr: string;
  };
  