"use client";

import { motion } from "framer-motion";

type LeaderboardStatsProps = {
  metrics: Record<string, number | string>;
  paymentMode: "mock" | "real";
};

export function LeaderboardStats({ metrics, paymentMode }: LeaderboardStatsProps) {
  const labels: Record<string, string> = {
    sourcesRegistered: "Evidence Assets",
    paidEvidenceUnlocks: "Funded Unlocks",
    totalUSDCDistributed: paymentMode === "real" ? "Gateway USDC Credited" : "Test Capital",
    contributorsRewarded: "Rewarded Contributors",
    fundedCommissions: "Funded Commissions"
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
      }}
      className="grid overflow-hidden rounded-xl border border-marble/10 bg-panel/65 sm:grid-cols-2 lg:grid-cols-5"
    >
      {Object.entries(labels).map(([key, label]) => (
        <motion.div 
          variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
          key={key} 
          className="border-b border-marble/10 p-5 text-center last:border-b-0 sm:border-r lg:border-b-0 lg:last:border-r-0"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">{label}</p>
          <p className="mt-3 font-mono text-2xl text-gold">{metrics[key] ?? "—"}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
