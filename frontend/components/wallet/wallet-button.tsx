"use client";

import { LogOut, WalletCards } from "lucide-react";
import { useMaecenasWallet } from "@/components/wallet/maecenas-wallet-provider";

export function WalletButton() {
  const { address, logout, openWallet } = useMaecenasWallet();

  if (!address) {
    return (
      <button
        type="button"
        onClick={openWallet}
        className="inline-flex items-center gap-2 border border-marble/15 bg-panel px-3 py-2 font-mono text-[11px] uppercase text-muted transition hover:bg-marble/10 hover:text-cream"
      >
        <WalletCards size={14} />
        Connect with Dynamic
      </button>
    );
  }

  return (
    <div className="flex items-center border border-marble/15 bg-panel">
      <button
        type="button"
        onClick={openWallet}
        className="px-3 py-2 font-mono text-[11px] text-cream transition hover:bg-marble/10"
      >
        {`${address.slice(0, 6)}...${address.slice(-4)}`}
      </button>
      <button
        type="button"
        onClick={() => void logout()}
        className="inline-flex h-9 w-9 items-center justify-center border-l border-marble/15 text-muted transition hover:bg-marble/10 hover:text-cream"
        aria-label="Disconnect Dynamic wallet"
        title="Disconnect wallet"
      >
        <LogOut size={14} />
      </button>
    </div>
  );
}
