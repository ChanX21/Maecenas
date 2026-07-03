"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleDollarSign } from "lucide-react";
import { getUsage } from "@/api";
import { getAuthToken, getSavedWallet, getSessionId } from "@/browser";
import type { Usage } from "@/types";

export function SessionStatus() {
  const [usage, setUsage] = useState<Usage>();
  const [wallet, setWallet] = useState("");

  const refresh = useCallback(() => {
    const savedWallet = getSavedWallet();
    setWallet(savedWallet);
    getUsage(getSessionId(), getAuthToken() ? savedWallet || undefined : undefined).then(setUsage).catch(() => setUsage(undefined));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("maecenas:usage-changed", refresh);
    window.addEventListener("maecenas:wallet-changed", refresh);
    return () => {
      window.removeEventListener("maecenas:usage-changed", refresh);
      window.removeEventListener("maecenas:wallet-changed", refresh);
    };
  }, [refresh]);

  if (!usage) return null;
  return (
    <div className="flex items-center gap-2 border border-marble/15 bg-panel px-3 py-2 font-mono text-[11px] uppercase text-muted">
      <CircleDollarSign size={14} className="text-gold" />
      {usage.freeSearchesRemaining > 0 ? (
        <span>{usage.freeSearchesRemaining} patron grants left</span>
      ) : wallet ? (
        <span>{`${wallet.slice(0, 6)}...${wallet.slice(-4)}`}</span>
      ) : (
        <span>Fund with wallet</span>
      )}
    </div>
  );
}
