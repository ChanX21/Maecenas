"use client";

import { motion } from "framer-motion";

type LeaderboardStatsProps = {
  metrics: Record<string, number | string>;
};

const labels: Record<string, string> = {
  sourcesRegistered: "Sources Registered",
  paidEvidenceUnlocks: "Evidence Unlocks",
  totalTestUSDCDistributed: "Recorded Test USDC",
  sourceOwners: "Active Source Owners",
  researchQuestionsAnswered: "Research Questions Answered"
};

export function LeaderboardStats({ metrics }: LeaderboardStatsProps) {
  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
      }}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      {Object.entries(metrics).map(([key, value]) => (
        <motion.div 
          variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
          key={key} 
          className="roman-panel p-5 hover:border-gold/30 transition-colors"
        >
          <p className="font-mono text-[11px] uppercase text-dim">{labels[key] ?? key}</p>
          <p className="mt-4 font-display text-3xl text-gold">{value}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
