import { formatUSDC, parseUSDC } from "@/utils/money";

type BudgetMeterProps = {
  budgetUSDC: string;
  spentUSDC: string;
  considered: number;
  purchased: number;
  skipped: number;
};

export function BudgetMeter({ budgetUSDC, spentUSDC, considered, purchased, skipped }: BudgetMeterProps) {
  const remaining = formatUSDC(Math.max(0, parseUSDC(budgetUSDC) - parseUSDC(spentUSDC)));
  return (
    <dl className="grid border-y border-marble/10 sm:grid-cols-5">
      <Metric label="Evidence budget" value={`${budgetUSDC} USDC`} />
      <Metric label="Selected" value={String(purchased)} />
      <Metric label="Considered" value={String(considered)} />
      <Metric label="Spent" value={`${spentUSDC} USDC`} />
      <Metric label="Remaining" value={`${remaining} USDC`} detail={`${skipped} not selected`} />
    </dl>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="border-b border-marble/10 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="font-mono text-[10px] uppercase text-dim">{label}</dt>
      <dd className="mt-1 text-sm text-cream">{value}</dd>
      {detail ? <dd className="mt-1 text-xs text-muted">{detail}</dd> : null}
    </div>
  );
}
