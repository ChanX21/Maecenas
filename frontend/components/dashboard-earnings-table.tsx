import Link from "next/link";
import type { CitationPayment } from "@/types";

export function DashboardEarningsTable({ receipts }: { receipts: CitationPayment[] }) {
  return (
    <section>
      <h2 className="font-display text-2xl text-cream">Evidence receipts</h2>
      {receipts.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse font-mono text-xs">
            <thead className="text-left uppercase text-dim">
              <tr>
                <th className="border-b border-marble/10 py-3 pr-4">Date</th>
                <th className="border-b border-marble/10 py-3 pr-4">Source</th>
                <th className="border-b border-marble/10 py-3 pr-4">Amount</th>
                <th className="border-b border-marble/10 py-3 pr-4">Settlement</th>
                <th className="border-b border-marble/10 py-3 pr-4">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="text-muted">
                  <td className="border-b border-marble/10 py-3 pr-4">{new Date(receipt.createdAt).toLocaleDateString()}</td>
                  <td className="border-b border-marble/10 py-3 pr-4 text-cream">{receipt.sourceTitle}</td>
                  <td className="border-b border-marble/10 py-3 pr-4">{receipt.amountUSDC} USDC</td>
                  <td className="border-b border-marble/10 py-3 pr-4">{receipt.status === "mock" ? "Mock / not settled" : receipt.status}</td>
                  <td className="border-b border-marble/10 py-3 pr-4">
                    <Link href={`/receipts/${receipt.id}`} className="text-gold">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 border-y border-marble/10 py-5 text-sm text-muted">No evidence receipts yet.</p>
      )}
    </section>
  );
}
