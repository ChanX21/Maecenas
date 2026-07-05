import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import {
  arcExplorerTxUrl,
  circleGatewayPaymentUrl,
  getCitationSettlementHash,
  shortenTxHash
} from "@/lib/arc-explorer";
import type { CitationPayment } from "@/types";

type TransactionProofLinkProps = {
  receipt: Pick<CitationPayment, "txHash" | "paymentId" | "status">;
  className?: string;
  label?: string;
  showHash?: boolean;
};

export function TransactionProofLink({
  receipt,
  className = "inline-flex items-center gap-1 font-mono text-xs text-gold hover:text-cream",
  label = "View on ArcScan",
  showHash = false
}: TransactionProofLinkProps) {
  const txHash = getCitationSettlementHash(receipt);
  if (!txHash) return null;

  return (
    <a
      href={arcExplorerTxUrl(txHash)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={`Arc testnet transaction ${txHash}`}
    >
      {showHash ? shortenTxHash(txHash) : label}
      <ArrowUpRight size={11} />
    </a>
  );
}

type SettlementProofProps = {
  receipt: Pick<CitationPayment, "txHash" | "paymentId" | "status">;
  className?: string;
  linkClassName?: string;
};

/** Always visible: ArcScan link for settled txs, otherwise explains why proof is missing. */
export function SettlementProof({
  receipt,
  className = "font-mono text-xs text-muted",
  linkClassName = "inline-flex items-center gap-1 text-gold hover:text-cream"
}: SettlementProofProps) {
  const txHash = getCitationSettlementHash(receipt);
  if (txHash) {
    return (
      <TransactionProofLink
        receipt={receipt}
        showHash
        label="ArcScan proof"
        className={linkClassName}
      />
    );
  }

  if (receipt.status === "mock") {
    return <span className={className}>Test record · no on-chain proof</span>;
  }

  if (receipt.paymentId) {
    const gatewayUrl = circleGatewayPaymentUrl(receipt.paymentId);
    if (gatewayUrl) {
      return (
        <a
          href={gatewayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
          title={`Verify x402 payment ${receipt.paymentId} with Circle Gateway`}
        >
          Verify x402 with Circle <ArrowUpRight size={11} />
        </a>
      );
    }
    return <span className={className}>Gateway payment · {receipt.paymentId}</span>;
  }

  return <span className={className}>No payment reference recorded</span>;
}

type ReceiptRecordLinksProps = {
  receipt: CitationPayment;
};

export function ReceiptRecordLinks({ receipt }: ReceiptRecordLinksProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href={`/receipts/${receipt.id}`} className="font-mono text-xs text-gold hover:text-cream">
        Open record
      </Link>
      <SettlementProof receipt={receipt} />
    </div>
  );
}
