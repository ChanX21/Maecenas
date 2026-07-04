"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Check } from "lucide-react";

export function ShareAnswerButton({ answerId, prompt }: { answerId: string; prompt: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/answer/${answerId}`;
    const shareData = {
      title: `Maecenas Research: ${prompt}`,
      text: `Evidence-grounded research on: "${prompt}"`,
      url,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // user dismissed share dialog — no-op
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleShare}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      className="inline-flex items-center gap-2 rounded-md border border-marble/15 bg-ink-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition hover:border-gold/40 hover:text-gold"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 text-gold"
          >
            <Check size={12} /> Link copied
          </motion.span>
        ) : (
          <motion.span
            key="share"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5"
          >
            <Share2 size={12} /> Share research
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
