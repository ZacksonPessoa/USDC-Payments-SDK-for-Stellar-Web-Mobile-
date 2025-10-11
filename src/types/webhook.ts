export type WebhookEventType = 
  | "payment.created"      // Sessão de pagamento criada
  | "payment.submitted"    // Transação enviada para Horizon
  | "payment.confirmed"    // Transação confirmada na blockchain
  | "payment.failed"       // Transação falhou
  | "payment.expired";     // Sessão expirou

export type PaymentRequest = {
  amount: number;              // ex.: 10
  assetCode: string;           // ex.: "USDC"
  issuer?: string;             // ex.: "GA...ISSUER" (opcional para XLM)
  destination: string;         // conta de destino
  memo?: string;
};

export type WebhookPayload = {
  id: string;                    // ID único do evento
  type: WebhookEventType;        // Tipo do evento
  timestamp: string;             // ISO timestamp
  sessionId: string;            // ID da sessão de pagamento
  transactionHash?: string;     // Hash da transação (quando disponível)
  paymentRequest: PaymentRequest; // Dados originais do pagamento
  metadata?: Record<string, any>; // Dados adicionais
};

export type WebhookConfig = {
  url: string;                   // URL do webhook
  secret?: string;               // Secret para assinatura HMAC
  retryAttempts?: number;        // Número de tentativas (default: 3)
  timeout?: number;              // Timeout em ms (default: 5000)
};

export type WebhookResult = {
  success: boolean;
  attempt: number;
  response?: {
    status: number;
    statusText: string;
    body?: any;
  };
  error?: string;
};
