"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleDollarSign } from "lucide-react";
import { getUsage } from "@/api";
import { getAuthToken, getSessionId } from "@/lib/browser-session";
import { useMaecenasWallet } from "@/components/wallet/maecenas-wallet-provider";
import type { Usage } from "@/types";

export function SessionStatus() {
  const { address } = useMaecenasWallet();
  const [usage, setUsage] = useState<Usage>();

  const refresh = useCallback(() => {
    getUsage(getSessionId(), getAuthToken() ? address || undefined : undefined)
      .then(setUsage)
      .catch(() => setUsage(undefined));
  }, [address]);

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
      ) : address ? (
        <span>Dynamic wallet ready</span>
      ) : (
        <span>Fund with wallet</span>
      )}
    </div>
  );
}
