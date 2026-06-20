import { formatUSDC, parseUSDC } from "@/lib/utils/money";

type BudgetMeterProps = {
  budgetUSDC: string;
  spentUSDC: string;
  considered: number;
  purchased: number;
  skipped: number;
};

export function BudgetMeter({ budgetUSDC, spentUSDC, considered, purchased, skipped }: BudgetMeterProps) {
  const budget = parseUSDC(budgetUSDC);
  const spent = parseUSDC(spentUSDC);
  const percentage = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;

  return (
    <div className="roman-panel p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Research budget</p>
        <p className="font-mono text-sm text-gold">{budgetUSDC} USDC</p>
      </div>
      <div className="mt-4 h-2 bg-ink-2">
        <div className="h-full bg-gold" style={{ width: `${percentage}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-5">
        <Metric label="Considered" value={String(considered)} />
        <Metric label="Bought" value={String(purchased)} />
        <Metric label="Skipped" value={String(skipped)} />
        <Metric label="Spent" value={`${spentUSDC} USDC`} />
        <Metric label="Remaining" value={`${formatUSDC(Math.max(0, budget - spent))} USDC`} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-marble/10 bg-ink-2 p-3">
      <p className="uppercase text-dim">{label}</p>
      <p className="mt-2 text-cream">{value}</p>
    </div>
  );
}
