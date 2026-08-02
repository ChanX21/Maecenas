"use client";

import { motion } from "framer-motion";
import type { LeaderboardResponse } from "@/api";
import { formatUSDC, parseUSDC } from "@/utils/money";

type LeaderboardStatsProps = {
  metrics: LeaderboardResponse["metrics"];
  paymentMode: "mock" | "real";
};

export function LeaderboardStats({ metrics, paymentMode }: LeaderboardStatsProps) {
  const averageUnlock = metrics.paidEvidenceUnlocks
    ? parseUSDC(metrics.totalUSDCDistributed) / metrics.paidEvidenceUnlocks
    : 0;
  const cardFeeMultiple = averageUnlock ? Math.round(0.3 / averageUnlock) : 0;
  const labels: Record<string, string> = {
    sourcesRegistered: "Evidence Assets",
    paidEvidenceUnlocks: "Funded Unlocks",
    totalUSDCDistributed: paymentMode === "real" ? "Gateway USDC Credited" : "Test Capital",
    contributorsRewarded: "Rewarded Contributors",
    fundedCommissions: "Funded Commissions"
  };

  return (
    <motion.section
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
      }}
      className="overflow-hidden rounded-xl border border-marble/10 bg-panel/65"
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(labels).map(([key, label]) => (
          <motion.div
            variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
            key={key}
            className="border-b border-marble/10 p-5 text-center sm:border-r lg:border-b-0 lg:last:border-r-0"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">{label}</p>
            <p className="mt-3 font-mono text-2xl text-gold">{metrics[key as keyof typeof metrics] ?? "—"}</p>
          </motion.div>
        ))}
      </div>
      <div className="border-t border-marble/10 p-5 sm:p-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Economic proof</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Proof label="Average evidence unlock" value={`${formatUSDC(averageUnlock)} USDC`} />
          <Proof label="Paid commission revenue" value={`${metrics.paidSearchRevenueUSDC} USDC`} />
          <Proof label="Paid-run evidence payouts" value={`${metrics.userPaidSourcePayoutsUSDC} USDC`} />
        </div>
        <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-marble/10 pt-4 font-mono text-xs">
          <p className="text-muted">
            Patron revenue <span className="text-cream">{metrics.paidSearchRevenueUSDC}</span>
            <span className="mx-2 text-dim">→</span>
            evidence <span className="text-cream">{metrics.userPaidSourcePayoutsUSDC}</span>
            <span className="mx-2 text-dim">→</span>
            gross retained <span className="text-gold">{metrics.grossRetainedUSDC} USDC</span>
          </p>
          <p className="text-muted">
            {cardFeeMultiple ? `${cardFeeMultiple}× smaller than a $0.30 fixed card fee` : "Awaiting funded unlocks"}
            <span className="ml-2 text-dim">· before AI and infrastructure costs</span>
          </p>
        </div>
      </div>
    </motion.section>
  );
}

function Proof({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-marble/10 bg-ink-2 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">{label}</p>
      <p className="mt-2 font-mono text-lg text-cream">{value}</p>
    </div>
  );
}
