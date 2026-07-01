"use client";

import { motion } from "framer-motion";
import type { CitationPayment } from "@/types";

export function RecentPaymentsFeed({ receipts }: { receipts: CitationPayment[] }) {
  return (
    <div className="roman-panel p-5">
      <h2 className="font-display text-3xl text-cream">Recent Evidence Receipts</h2>
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
        className="mt-5 space-y-3"
      >
        {receipts.length === 0 ? (
          <p className="text-sm text-muted">No receipts yet.</p>
        ) : (
          receipts.map((receipt) => (
            <motion.div 
              variants={{ hidden: { opacity: 0, x: 10 }, show: { opacity: 1, x: 0 } }}
              key={receipt.id} 
              className="border border-marble/10 bg-ink-2 p-4"
            >
              <p className="font-mono text-sm text-cream">
                Maecenas recorded {receipt.amountUSDC} USDC for &ldquo;{receipt.sourceTitle}&rdquo;
              </p>
              <p className="mt-2 font-mono text-xs uppercase text-dim">
                {receipt.status === "mock" ? "Mock / not settled" : receipt.status} · {receipt.paymentId}
              </p>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
