"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Coins, Cpu } from "lucide-react";

export function AnimatedResearchLoader({ stage }: { stage: string }) {
  const isPayment = stage.toLowerCase().includes("payment") || stage.toLowerCase().includes("wallet");
  
  // Rotating text for research phase
  const researchPhrases = [
    "Scouting verified cryptographic sources...",
    "Scanning evidence ledgers...",
    "Evaluating budget thresholds...",
    "Synthesizing final response...",
  ];
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (!isPayment) {
      const interval = setInterval(() => {
        setPhraseIndex((prev) => (prev + 1) % researchPhrases.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isPayment, researchPhrases.length]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -15, filter: "blur(8px)" }}
      transition={{ type: "spring", bounce: 0, duration: 0.6 }}
      className={`mt-6 flex items-center gap-4 rounded-xl border p-5 shadow-2xl backdrop-blur-md transition-all duration-700 ${
        isPayment 
          ? "border-gold/30 bg-gold/10 shadow-[0_10px_40px_rgba(212,175,55,0.1)]" 
          : "border-marble/15 bg-ink-2 shadow-[0_10px_40px_rgba(227,231,226,0.05)]"
      }`}
    >
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
        <AnimatePresence mode="wait">
          {isPayment ? (
            <motion.div
              key="payment-icon"
              initial={{ scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, rotate: 90, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="flex h-full w-full items-center justify-center rounded-full bg-gold/20 text-gold ring-1 ring-gold/40 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
            >
              <Coins size={20} className="animate-pulse" />
            </motion.div>
          ) : (
            <motion.div
              key="research-icon"
              initial={{ scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, rotate: 90, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="flex h-full w-full items-center justify-center rounded-full bg-marble/10 text-marble ring-1 ring-marble/30"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
              >
                <Cpu size={20} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-1 overflow-hidden">
        <p className={`font-mono text-[10px] uppercase tracking-widest ${isPayment ? "text-gold/80" : "text-dim"}`}>
          {isPayment ? "Settlement Protocol" : "Autonomous Agent"}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={isPayment ? stage : researchPhrases[phraseIndex]}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.3 }}
            className={`text-[15px] font-medium tracking-tight ${isPayment ? "text-gold" : "text-cream"}`}
          >
            {isPayment ? stage : researchPhrases[phraseIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
