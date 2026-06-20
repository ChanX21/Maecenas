import type { CitationPayment } from "@/lib/types";

export function RecentPaymentsFeed({ receipts }: { receipts: CitationPayment[] }) {
  return (
    <div className="border border-white/10 bg-panel p-5">
      <h2 className="font-display text-3xl text-cream">Recent Payment Stream</h2>
      <div className="mt-5 space-y-3">
        {receipts.length === 0 ? (
          <p className="text-sm text-muted">No payments yet. Run a research question to create receipts.</p>
        ) : (
          receipts.map((receipt) => (
            <div key={receipt.id} className="border border-white/8 bg-ink-2 p-4">
              <p className="font-mono text-sm text-cream">
                Mecenas Scholar paid {receipt.amountUSDC} USDC to "{receipt.sourceTitle}"
              </p>
              <p className="mt-2 font-mono text-xs uppercase text-dim">{receipt.status} · {receipt.paymentId}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
