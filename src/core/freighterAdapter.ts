// Freighter adapter (browser)
import type { WalletAdapter, NetworkName } from "../types";

declare global {
  interface Window {
    freighterApi?: {
      isConnected: () => Promise<boolean>;
      getPublicKey: () => Promise<string>;
      signAndSubmitXDR: (xdr: string, opts: { network: NetworkName }) => Promise<string>;
    };
  }
}

export class FreighterWallet implements WalletAdapter {
  async getPublicKey(): Promise<string> {
    if (!window.freighterApi) throw new Error("Freighter not found");
    return window.freighterApi.getPublicKey();
  }

  async signAndSubmit(xdr: string, network: NetworkName): Promise<{ hash: string }> {
    if (!window.freighterApi) throw new Error("Freighter not found");
    const hash = await window.freighterApi.signAndSubmitXDR(xdr, { network });
    return { hash };
  }
}
