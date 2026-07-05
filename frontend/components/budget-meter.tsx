"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { formatUSDC, parseUSDC } from "@/utils/money";

type BudgetMeterProps = {
  budgetUSDC: string;
  spentUSDC: string;
  considered: number;
  purchased: number;
  skipped: number;
};

function AnimatedNumber({ value, isUSDC = false }: { value: number; isUSDC?: boolean }) {
  const spring = useSpring(0, { bounce: 0, duration: 800 });
  
  const display = useTransform(spring, (current) => 
    isUSDC ? formatUSDC(current) : Math.round(current).toString()
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

export function BudgetMeter({ budgetUSDC, spentUSDC, considered, purchased, skipped }: BudgetMeterProps) {
  const budget = parseUSDC(budgetUSDC);
  const spent = parseUSDC(spentUSDC);
  const remaining = Math.max(0, budget - spent);
  
  const progressPercent = budget > 0 ? (spent / budget) * 100 : 0;

  return (
    <div className="space-y-4">
      <dl className="grid overflow-hidden rounded-lg border border-marble/10 bg-ink-2/60 sm:grid-cols-5">
        <Metric label="Treasury limit" value={<><AnimatedNumber value={budget} isUSDC /> USDC</>} />
        <Metric label="Funded" value={<AnimatedNumber value={purchased} />} />
        <Metric label="Reviewed" value={<AnimatedNumber value={considered} />} />
        <Metric label="Deployed" value={<span className="text-gold"><AnimatedNumber value={spent} isUSDC /> USDC</span>} />
        <Metric label="Reserve" value={<><AnimatedNumber value={remaining} isUSDC /> USDC</>} detail={`${skipped} passed over`} />
      </dl>

    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return (
    <div className="border-b border-marble/10 px-4 py-4 text-center last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="font-mono text-[10px] uppercase text-dim">{label}</dt>
      <dd className="mt-1 text-sm text-cream font-mono tracking-tight">{value}</dd>
      {detail ? <dd className="mt-1 text-xs text-muted font-mono">{detail}</dd> : null}
    </div>
  );
}
