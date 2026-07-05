"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, CircleDollarSign, LoaderCircle, X } from "lucide-react";
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
        <GatewayProofDialog
          paymentId={receipt.paymentId}
          gatewayUrl={gatewayUrl}
          className={linkClassName}
        />
      );
    }
    return <span className={className}>Gateway payment · {receipt.paymentId}</span>;
  }

  return <span className={className}>No payment reference recorded</span>;
}

type GatewayProof = {
  id: string;
  status: string;
  token: string;
  sendingNetwork: string;
  recipientNetwork: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  createdAt: string;
  updatedAt: string;
};

function GatewayProofDialog({
  paymentId,
  gatewayUrl,
  className
}: {
  paymentId: string;
  gatewayUrl: string;
  className: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [proof, setProof] = useState<GatewayProof>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  async function openProof() {
    setIsOpen(true);
    if (proof) return;

    try {
      const response = await fetch(`/api/circle-proof/${encodeURIComponent(paymentId)}`);
      if (!response.ok) throw new Error("Circle could not verify this payment.");
      setProof(await response.json() as GatewayProof);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Verification failed.");
    }
  }

  return (
    <>
      <button type="button" onClick={openProof} className={className}>
        Verify x402 with Circle <CircleDollarSign size={12} />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="circle-proof-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setIsOpen(false);
          }}
        >
          <div className="roman-panel relative w-full max-w-xl overflow-hidden p-6 sm:p-8">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center border border-marble/10 text-muted hover:bg-marble/10 hover:text-cream"
              aria-label="Close Circle payment proof"
            >
              <X size={17} />
            </button>

            <CircleDollarSign className="text-gold" size={26} />
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Circle Gateway · x402
            </p>
            <h2 id="circle-proof-title" className="mt-2 font-display text-3xl text-cream">
              Payment proof
            </h2>

            {!proof && !error ? (
              <div className="mt-7 flex items-center gap-3 border border-marble/10 bg-ink-2 p-4">
                <LoaderCircle className="animate-spin text-gold" size={19} />
                <p className="font-mono text-xs text-muted">Verifying directly with Circle Gateway...</p>
              </div>
            ) : error ? (
              <p className="mt-7 border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</p>
            ) : proof ? (
              <>
                <div className="mt-7 flex items-center gap-3 border border-success/30 bg-success/5 p-4">
                  <CheckCircle2 className="shrink-0 text-success" size={21} />
                  <div>
                    <p className="font-mono text-xs uppercase text-success">Verified by Circle</p>
                    <p className="mt-1 text-sm text-muted">Gateway transfer {proof.status}</p>
                  </div>
                </div>
                <dl className="mt-6 grid gap-4 font-mono text-xs sm:grid-cols-2">
                  <ProofField label="Amount" value={`${formatGatewayAmount(proof.amount)} ${proof.token}`} />
                  <ProofField label="Network" value={networkLabel(proof.recipientNetwork)} />
                  <ProofField label="From" value={proof.fromAddress} />
                  <ProofField label="To" value={proof.toAddress} />
                  <ProofField label="Payment ID" value={proof.id} />
                  <ProofField label="Confirmed" value={new Date(proof.updatedAt).toLocaleString()} />
                </dl>
              </>
            ) : null}

            <a
              href={gatewayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-1 font-mono text-xs text-gold hover:text-cream"
            >
              Inspect raw Circle record <ArrowUpRight size={11} />
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ProofField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-marble/10 pb-3">
      <dt className="uppercase text-dim">{label}</dt>
      <dd className="mt-1 break-all text-cream">{value}</dd>
    </div>
  );
}

function formatGatewayAmount(amount: string): string {
  const padded = amount.padStart(7, "0");
  const fraction = padded.slice(-6).replace(/0+$/, "");
  return `${padded.slice(0, -6)}.${fraction || "0"}`;
}

function networkLabel(network: string): string {
  return network === "eip155:5042002" ? "Arc Testnet (5042002)" : network;
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
