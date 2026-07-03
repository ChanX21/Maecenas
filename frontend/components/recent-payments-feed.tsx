"use client";

import { motion } from "framer-motion";
import type { CitationPayment } from "@/types";

export function RecentPaymentsFeed({ receipts }: { receipts: CitationPayment[] }) {
  return (
    <div className="roman-panel p-5 sm:p-7">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Latest activity</p>
      <h2 className="mt-2 font-display text-3xl text-cream">Treasury pulse</h2>
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
        className="mt-5 divide-y divide-marble/10 border-y border-marble/10"
      >
        {receipts.length === 0 ? (
          <p className="text-sm text-muted">No treasury activity yet.</p>
        ) : (
          receipts.map((receipt) => (
            <motion.div 
              variants={{ hidden: { opacity: 0, x: 10 }, show: { opacity: 1, x: 0 } }}
              key={receipt.id} 
              className="py-4"
            >
              <p className="font-mono text-sm text-cream">
                Funded {receipt.amountUSDC} USDC for &ldquo;{receipt.sourceTitle}&rdquo;
              </p>
              <p className="mt-2 font-mono text-xs uppercase text-dim">
                {receipt.status === "mock" ? "Test record / not settled" : receipt.status} · {receipt.paymentId}
              </p>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
