import type { CitationPayment } from "@/types";

export function RecentPaymentsFeed({ receipts }: { receipts: CitationPayment[] }) {
  return (
    <div className="roman-panel p-5">
      <h2 className="font-display text-3xl text-cream">Recent Evidence Receipts</h2>
      <div className="mt-5 space-y-3">
        {receipts.length === 0 ? (
          <p className="text-sm text-muted">No receipts yet.</p>
        ) : (
          receipts.map((receipt) => (
            <div key={receipt.id} className="border border-marble/10 bg-ink-2 p-4">
              <p className="font-mono text-sm text-cream">
                Maecenas recorded {receipt.amountUSDC} USDC for &ldquo;{receipt.sourceTitle}&rdquo;
              </p>
              <p className="mt-2 font-mono text-xs uppercase text-dim">
                {receipt.status === "mock" ? "Mock / not settled" : receipt.status} · {receipt.paymentId}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
