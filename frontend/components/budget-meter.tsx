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
  
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 overflow-hidden sm:grid-cols-5">
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
    <div className="border-b border-r border-marble/10 px-2 py-3 text-center even:border-r-0 last:col-span-2 last:border-b-0 sm:col-span-1 sm:border-b-0 sm:border-r sm:px-4 sm:py-4 sm:last:col-span-1 sm:last:border-r-0">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="mt-2 text-sm tabular-nums text-cream">{value}</dd>
      {detail ? <dd className="mt-1 text-[11px] text-muted">{detail}</dd> : null}
    </div>
  );
}
