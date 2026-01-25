/**
 * SEP-24 (Deposit & Withdrawal) Helpers
 * 
 * SEP-24 is a standard protocol for on/off-ramp services on Stellar.
 * This module provides helpers to interact with SEP-24 compliant anchors.
 */

export interface SEP24Config {
  anchorUrl: string;           // Base URL of the anchor (e.g., "https://anchor.example.com")
  assetCode: string;           // Asset code (e.g., "USDC")
  assetIssuer?: string;        // Asset issuer (optional, for non-native)
  network: "TESTNET" | "PUBLIC";
}

export interface SEP24DepositRequest {
  account: string;              // Stellar account to deposit to
  assetCode: string;
  amount?: number;              // Optional: specific amount
  email?: string;               // Optional: user email
  lang?: string;                // Optional: language code
}

export interface SEP24WithdrawRequest {
  account: string;              // Stellar account to withdraw from
  assetCode: string;
  amount: number;               // Required: amount to withdraw
  type?: string;                // Optional: withdrawal type (e.g., "bank_account", "crypto")
  email?: string;               // Optional: user email
  lang?: string;                // Optional: language code
}

export interface SEP24Transaction {
  id: string;
  kind: "deposit" | "withdrawal";
  status: "pending" | "pending_user_transfer_start" | "pending_external" | "completed" | "error";
  amountIn?: string;
  amountOut?: string;
  amountFee?: string;
  from?: string;
  to?: string;
  startedAt?: string;
  completedAt?: string;
  moreInfoUrl?: string;
  message?: string;
}

export interface SEP24InteractiveResponse {
  type: "interactive_customer_info_needed" | "non_interactive_customer_info_needed" | "customer_info_status";
  url?: string;                 // URL for interactive flow
  id?: string;                  // Transaction ID
  message?: string;
}

/**
 * Get SEP-24 info from an anchor
 */
export async function getSEP24Info(config: SEP24Config): Promise<any> {
  const infoUrl = `${config.anchorUrl}/.well-known/stellar.toml`;
  
  try {
    const response = await fetch(infoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch SEP-24 info: ${response.statusText}`);
    }
    
    const text = await response.text();
    // Note: In production, you'd want to parse TOML properly
    // For now, we'll return the raw text
    return { raw: text };
  } catch (error) {
    throw new Error(`Failed to get SEP-24 info: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Initiate a deposit flow with a SEP-24 anchor
 */
export async function initiateDeposit(
  config: SEP24Config,
  request: SEP24DepositRequest
): Promise<SEP24InteractiveResponse> {
  const depositUrl = `${config.anchorUrl}/sep24/transactions/deposit/interactive`;
  
  const params = new URLSearchParams({
    asset_code: request.assetCode,
    account: request.account,
  });

  if (request.amount) {
    params.append("amount", request.amount.toString());
  }
  if (request.email) {
    params.append("email", request.email);
  }
  if (request.lang) {
    params.append("lang", request.lang);
  }

  try {
    const response = await fetch(`${depositUrl}?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Deposit initiation failed: ${error.error || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(
      `Failed to initiate deposit: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Initiate a withdrawal flow with a SEP-24 anchor
 */
export async function initiateWithdrawal(
  config: SEP24Config,
  request: SEP24WithdrawRequest
): Promise<SEP24InteractiveResponse> {
  const withdrawUrl = `${config.anchorUrl}/sep24/transactions/withdraw/interactive`;
  
  const params = new URLSearchParams({
    asset_code: request.assetCode,
    account: request.account,
    amount: request.amount.toString(),
  });

  if (request.type) {
    params.append("type", request.type);
  }
  if (request.email) {
    params.append("email", request.email);
  }
  if (request.lang) {
    params.append("lang", request.lang);
  }

  try {
    const response = await fetch(`${withdrawUrl}?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Withdrawal initiation failed: ${error.error || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(
      `Failed to initiate withdrawal: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check the status of a SEP-24 transaction
 */
export async function getTransactionStatus(
  config: SEP24Config,
  transactionId: string,
  account: string
): Promise<SEP24Transaction> {
  const statusUrl = `${config.anchorUrl}/sep24/transaction`;
  
  const params = new URLSearchParams({
    id: transactionId,
    account: account,
  });

  try {
    const response = await fetch(`${statusUrl}?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to get transaction status: ${error.error || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(
      `Failed to get transaction status: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Helper class for managing SEP-24 flows
 */
export class SEP24Helper {
  constructor(private config: SEP24Config) {}

  async getInfo() {
    return getSEP24Info(this.config);
  }

  async deposit(request: SEP24DepositRequest) {
    return initiateDeposit(this.config, request);
  }

  async withdraw(request: SEP24WithdrawRequest) {
    return initiateWithdrawal(this.config, request);
  }

  async getStatus(transactionId: string, account: string) {
    return getTransactionStatus(this.config, transactionId, account);
  }
}
