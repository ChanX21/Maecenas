"use client";

import { LogOut, WalletCards } from "lucide-react";
import { useMaecenasWallet } from "@/components/wallet/maecenas-wallet-provider";

export function WalletButton({ compact = false, onOpen }: { compact?: boolean; onOpen?: () => void }) {
  const { address, logout, openWallet } = useMaecenasWallet();

  function showWallet() {
    onOpen?.();
    openWallet();
  }

  if (!address) {
    return (
      <button
        type="button"
        onClick={showWallet}
        aria-label="Connect wallet"
        title={compact ? "Connect wallet" : undefined}
        className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-marble/5 hover:text-cream ${compact ? "justify-center" : ""}`}
      >
        <WalletCards size={20} strokeWidth={1.6} className="shrink-0" />
        {!compact ? <span>Connect wallet</span> : null}
      </button>
    );
  }

  return (
    <div className={`flex items-center rounded-lg bg-marble/[0.03] ${compact ? "flex-col" : ""}`}>
      <button
        type="button"
        onClick={showWallet}
        aria-label="Wallet details"
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-xs text-cream transition hover:bg-marble/5"
      >
        <WalletCards size={18} className="shrink-0 text-gold" />
        {!compact ? `${address.slice(0, 6)}...${address.slice(-4)}` : null}
      </button>
      <button
        type="button"
        onClick={() => void logout()}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-marble/5 hover:text-cream"
        aria-label="Disconnect Dynamic wallet"
        title="Disconnect wallet"
      >
        <LogOut size={14} />
      </button>
    </div>
  );
}
