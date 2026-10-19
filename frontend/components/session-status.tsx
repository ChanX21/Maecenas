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
    <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
      <CircleDollarSign size={14} className="text-gold" />
      {usage.freeSearchesRemaining > 0 ? (
        <span>{usage.freeSearchesRemaining} free searches left</span>
      ) : address ? (
        <span>Pay with wallet</span>
      ) : (
        <span>Connect wallet for paid research</span>
      )}
    </div>
  );
}
