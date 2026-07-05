"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getLeaderboard } from "@/api";
import { SettlementProof } from "@/components/transaction-proof-link";
import { citationPaymentStatusLabel } from "@/lib/arc-explorer";

export function LiveLedgerMetrics() {
  const { data: ledger } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboard,
    retry: false
  });

  const metrics = ledger?.metrics;
  const capitalLabel = ledger?.paymentMode === "real" ? "Gateway USDC credited" : "Test capital recorded";

  return (
    <>
      <Metric value={metrics?.fundedCommissions ?? "—"} label="Funded commissions" />
      <Metric value={metrics?.paidEvidenceUnlocks ?? "—"} label="Evidence unlocks" />
      <Metric value={metrics?.contributorsRewarded ?? "—"} label="Contributors rewarded" />
      <Metric value={metrics ? `${metrics.totalUSDCDistributed} USDC` : "—"} label={capitalLabel} />
    </>
  );
}

export function LiveLedgerStream() {
  const { data: ledger, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboard,
    retry: false
  });

  return (
    <div className="mt-5 divide-y divide-marble/10 border-y border-marble/10">
      {isLoading ? (
        <div className="py-10 text-center">
          <p className="text-sm text-muted">Connecting to ledger...</p>
        </div>
      ) : ledger?.recentPaymentStream.length ? (
        ledger.recentPaymentStream.slice(0, 3).map((receipt) => (
          <div key={receipt.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm text-cream">{receipt.sourceTitle}</p>
              <p className="mt-1 font-mono text-[10px] uppercase text-dim">
                Evidence funded · {receipt.amountUSDC} USDC
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span className="font-mono text-[10px] uppercase text-gold">
                {citationPaymentStatusLabel(receipt)}
              </span>
              <SettlementProof
                receipt={receipt}
                className="font-mono text-[10px] normal-case text-muted"
                linkClassName="inline-flex items-center gap-1 font-mono text-[10px] text-gold hover:text-cream"
              />
            </div>
          </div>
        ))
      ) : (
        <div className="py-10 text-center">
          <p className="text-sm text-muted">The ledger is ready for its first funded citation.</p>
          <Link href="/sources" className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase text-gold">
            Explore the archive <ArrowUpRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="border-b border-marble/10 px-5 py-5 text-center last:border-b-0 sm:border-b-0 sm:border-r sm:[&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r lg:last:border-r-0">
      <p className="font-mono text-xl text-gold sm:text-2xl">{value}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
    </div>
  );
}
