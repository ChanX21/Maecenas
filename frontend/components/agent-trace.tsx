"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { ScoredSource, TraceEvent } from "@/types";

function TypewriterText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let i = 0;
    setDisplayedText("");
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
}

export function AgentTrace({ events, scoredSources }: { events: TraceEvent[]; scoredSources?: ScoredSource[] }) {
  return (
    <div className="space-y-8">
      <ol className="space-y-3">
        {events.map((event, i) => {
          const isPayment = event.title?.toLowerCase().includes("payment") || event.title?.toLowerCase().includes("receipt") || event.phase?.toLowerCase().includes("x402");
          
          return (
            <motion.li 
              key={event.id}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={isPayment ? { opacity: 1, y: 0, scale: [0.98, 1.02, 1] } : { opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
              className={`grid gap-1 border-b border-marble/10 pb-3 sm:grid-cols-[140px_1fr] ${isPayment ? 'border-gold/30' : ''}`}
            >
              <span className={`font-mono text-[11px] uppercase ${isPayment ? 'text-gold' : 'text-muted'}`}>
                {event.phase}
              </span>
              <div>
                <p className={`text-sm ${isPayment ? 'text-gold-soft' : 'text-cream'}`}>{event.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  <TypewriterText text={event.detail || ""} />
                </p>
              </div>
            </motion.li>
          );
        })}
      </ol>
      {scoredSources?.length ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: "spring" }}
          className="overflow-x-auto"
        >
          <table className="w-full min-w-[680px] border-collapse font-mono text-xs">
            <thead className="text-left uppercase text-dim">
              <tr>
                <th className="border-b border-marble/10 py-3 pr-4">Source</th>
                <th className="border-b border-marble/10 py-3 pr-4">Relevance</th>
                <th className="border-b border-marble/10 py-3 pr-4">Fit</th>
                <th className="border-b border-marble/10 py-3 pr-4">Final</th>
              </tr>
            </thead>
            <tbody>
              {scoredSources.map((source, idx) => (
                <motion.tr 
                  key={source.sourceId} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + (idx * 0.1) }}
                  className="text-muted hover:bg-marble/5 transition-colors"
                >
                  <td className="border-b border-marble/10 py-3 pr-4 text-cream">{source.title}</td>
                  <td className="border-b border-marble/10 py-3 pr-4">{source.relevanceScore}</td>
                  <td className="border-b border-marble/10 py-3 pr-4">{source.evidenceFitScore}</td>
                  <td className="border-b border-marble/10 py-3 pr-4 text-gold">{source.finalScore}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      ) : null}
    </div>
  );
}
