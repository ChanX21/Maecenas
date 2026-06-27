import Link from "next/link";
import type { CitationPayment } from "@/types";

export function PaymentReceiptCard({ receipt }: { receipt: CitationPayment }) {
  return (
    <article className="roman-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase text-gold">Evidence Receipt</p>
          <h2 className="mt-2 font-display text-2xl text-cream">{receipt.sourceTitle}</h2>
        </div>
        <span className="rounded-sm border border-white/10 px-2 py-1 font-mono text-xs uppercase text-muted">
          {receipt.status === "mock" ? "Mock x402 / test USDC proof" : receipt.status}
        </span>
      </div>
      <dl className="mt-5 space-y-3 font-mono text-xs">
        <Row label="Amount" value={`${receipt.amountUSDC} USDC`} />
        <Row label="Recipient" value={receipt.recipientWallet} />
        <Row label="Payer" value={receipt.payerAgent} />
        <Row
          label="Paid by"
          value={receipt.fundedBy === "user_paid_search" ? "User-funded research budget" : "Maecenas sponsored budget"}
        />
        <Row label="Payment ID" value={receipt.paymentId ?? "pending"} />
      </dl>
      <Link href={`/receipts/${receipt.id}`} className="mt-5 inline-block font-mono text-xs uppercase text-gold">
        Open receipt
      </Link>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 border-b border-white/8 pb-3 sm:grid-cols-[120px_1fr]">
      <dt className="uppercase text-dim">{label}</dt>
      <dd className="break-all text-muted">{value}</dd>
    </div>
  );
}
