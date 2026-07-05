"use client";

import { motion } from "framer-motion";
import { Check, FileKey2, Landmark, WalletCards } from "lucide-react";

type ResearchPaymentGateProps = {
  evidenceBudgetUSDC: string;
  isWalletConnected: boolean;
  mode: "mock" | "real";
  onConfirm: () => void;
  priceUSDC: string;
};

export function ResearchPaymentGate({
  evidenceBudgetUSDC,
  isWalletConnected,
  mode,
  onConfirm,
  priceUSDC
}: ResearchPaymentGateProps) {
  const isRealPayment = mode === "real";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
      exit={{ opacity: 0, height: 0, filter: "blur(4px)" }}
      transition={{ type: "spring", bounce: 0.3 }}
      className="mt-5 overflow-hidden"
    >
      <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 shadow-[0_10px_30px_rgba(212,175,55,0.05)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-medium text-cream">
              <WalletCards size={17} className="text-gold" />
              {isRealPayment ? "Research access payment required" : "Start a test-funded research run"}
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              {isRealPayment
                ? `${priceUSDC} USDC unlocks this research run. The ${evidenceBudgetUSDC} USDC evidence budget is separate and limits what the agent may pay selected sources.`
                : `Test mode: no real USDC will move. Confirm to simulate the ${priceUSDC} USDC access payment, create a demo receipt, and start this research run.`}
            </p>
            {isRealPayment ? (
              <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10px] uppercase text-muted">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-marble/10 px-2 py-1">
                  <span className="text-gold">402</span> Payment required
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-marble/10 px-2 py-1">
                  <FileKey2 size={11} className="text-gold" /> EIP-712 authorization
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-marble/10 px-2 py-1">
                  <Landmark size={11} className="text-gold" /> Circle Gateway receipt
                </span>
              </div>
            ) : null}
          </div>
          <motion.button
            type="button"
            onClick={onConfirm}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="roman-button inline-flex shrink-0 items-center justify-center gap-2 bg-gold px-5 py-3 font-mono text-xs font-semibold uppercase text-ink transition-colors hover:bg-gold-soft"
          >
            <Check size={15} />
            {isWalletConnected
              ? isRealPayment
                ? `Pay ${priceUSDC} USDC via x402`
                : "Start test run"
              : "Connect wallet"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
