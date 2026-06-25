import Link from "next/link";
import type { CitationPayment } from "@/types";

export function DashboardEarningsTable({ receipts }: { receipts: CitationPayment[] }) {
  return (
    <div className="roman-panel overflow-x-auto p-5">
      <h2 className="font-display text-3xl text-cream">Latest Paid Citations</h2>
      <table className="mt-5 w-full min-w-[820px] border-collapse font-mono text-xs">
        <thead className="text-left uppercase text-dim">
          <tr>
            <th className="border-b border-white/10 py-3 pr-4">Date</th>
            <th className="border-b border-white/10 py-3 pr-4">Source</th>
            <th className="border-b border-white/10 py-3 pr-4">Question</th>
            <th className="border-b border-white/10 py-3 pr-4">Amount</th>
            <th className="border-b border-white/10 py-3 pr-4">Payer Agent</th>
            <th className="border-b border-white/10 py-3 pr-4">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((receipt) => (
            <tr key={receipt.id} className="text-muted">
              <td className="border-b border-white/8 py-3 pr-4">{new Date(receipt.createdAt).toLocaleDateString()}</td>
              <td className="border-b border-white/8 py-3 pr-4 text-cream">{receipt.sourceTitle}</td>
              <td className="max-w-xs truncate border-b border-white/8 py-3 pr-4">{receipt.userPrompt}</td>
              <td className="border-b border-white/8 py-3 pr-4 text-gold">{receipt.amountUSDC} USDC</td>
              <td className="border-b border-white/8 py-3 pr-4">{receipt.payerAgent}</td>
              <td className="border-b border-white/8 py-3 pr-4">
                <Link href={`/receipts/${receipt.id}`} className="text-gold">
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
