"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CircleDollarSign, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
import { apiUrl, getPaymentVerification } from "@/api";
import { arcExplorerTxUrl, getCitationSettlementHash, shortenTxHash } from "@/lib/arc-explorer";
import type { CitationPayment, GatewayVerification } from "@/types";

type ProofRecord = Pick<CitationPayment, "txHash" | "paymentId" | "status" | "network"> & { id?: string };

export function TransactionProofLink({
  receipt,
  className = "inline-flex items-center gap-1 font-mono text-xs text-gold hover:text-cream",
  label = "View on ArcScan",
  showHash = false
}: {
  receipt: ProofRecord;
  className?: string;
  label?: string;
  showHash?: boolean;
}) {
  const txHash = getCitationSettlementHash(receipt);
  if (!txHash || !["eip155:5042", "eip155:5042002"].includes(receipt.network ?? "")) return null;
  return (
    <a href={arcExplorerTxUrl(txHash, receipt.network)} target="_blank" rel="noopener noreferrer" className={className}>
      {showHash ? shortenTxHash(txHash) : label} <ArrowUpRight size={11} />
    </a>
  );
}

export function SettlementProof({
  receipt,
  kind = "receipts",
  className = "font-mono text-xs text-muted",
  linkClassName = "inline-flex items-center gap-1 text-gold hover:text-cream"
}: {
  receipt: ProofRecord;
  kind?: "receipts" | "payments";
  className?: string;
  linkClassName?: string;
}) {
  if (receipt.status === "mock") return <span className={className}>No on-chain proof</span>;
  if (receipt.id) return <GatewayProofDialog record={receipt} kind={kind} className={linkClassName} />;
  return <span className={className}>Verification unavailable · reload after backend update</span>;
}

function GatewayProofDialog({
  record, kind, className
}: { record: ProofRecord; kind: "receipts" | "payments"; className: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<{ valid?: boolean; settlement: GatewayVerification }>();
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
      trigger.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !record.id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const next = await getPaymentVerification(record.id!, kind);
        if (cancelled) return;
        setResult(next);
        const status = next.settlement.transfer?.status;
        // Poll only while the dialog is open, for up to one minute. Manual refresh remains available.
        if (next.settlement.verification === "matched" && status !== "completed" && status !== "failed"
          && Date.now() - startedAt < 60_000) timer = setTimeout(load, 10_000);
      } catch {
        if (!cancelled) {
          setResult(undefined);
          setError("Verification unavailable. Please retry.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isOpen, record.id, kind, refresh]);

  const proof = result?.settlement;
  const transfer = proof?.transfer;
  const matches = proof?.verification === "matched" && result?.valid !== false;
  const settled = matches && (transfer?.status === "confirmed" || transfer?.status === "completed");
  const failed = transfer?.status === "failed";
  const mismatch = proof?.verification === "mismatch" || result?.valid === false;
  const statusLabel = transfer ? {
    received: "Pending settlement · received by Gateway",
    batched: "Pending settlement · included in a batch",
    confirmed: "Payment confirmed",
    completed: "Payment completed",
    failed: "Payment failed"
  }[transfer.status] : undefined;

  return (
    <>
      <button ref={trigger} type="button" onClick={() => setIsOpen(true)} className={className}>
        Verify x402 with Circle <CircleDollarSign size={12} />
      </button>
      {isOpen ? (
        <dialog
          ref={dialog}
          onClose={() => setIsOpen(false)}
          onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
          aria-labelledby={`proof-title-${record.id}`}
          className="roman-panel fixed m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto p-5 text-cream backdrop:bg-black/80 sm:p-8"
        >
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close payment proof"
            className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center border border-marble/10 text-muted">
            <X size={17} />
          </button>
          <CircleDollarSign className="text-gold" size={26} />
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Circle Gateway · x402</p>
          <h2 id={`proof-title-${record.id}`} className="mt-2 font-display text-3xl text-cream">Payment proof</h2>
          <div aria-live="polite" className="mt-7 border border-marble/10 bg-ink-2 p-4">
            {loading ? <p className="mb-2 flex items-center gap-2 text-sm text-muted"><LoaderCircle size={16} className="animate-spin" />Checking Circle…</p> : null}
            {error ? <p className="text-muted">{error}</p> : proof ? (
              <>
                <p className={mismatch || failed ? "text-danger" : settled ? "text-success" : "text-muted"}>
                  {mismatch ? "Payment details mismatch" : statusLabel ?? "Settlement not verified"}
                </p>
                <p className="mt-2 text-sm text-muted">{result?.valid === false ? "Maecenas receipt integrity check failed." : proof.message}</p>
              </>
            ) : null}
          </div>
          {transfer ? (
            <dl className="mt-6 grid gap-4 font-mono text-xs sm:grid-cols-2">
              <ProofField label="Circle amount" value={`${formatGatewayAmount(transfer.amount)} ${transfer.token}`} />
              <ProofField label="Network" value={transfer.recipientNetwork} />
              <ProofField label="From" value={transfer.fromAddress} />
              <ProofField label="To" value={transfer.toAddress} />
              <ProofField label="Payment ID" value={transfer.id} />
              <ProofField label="Circle updated" value={new Date(transfer.updatedAt).toLocaleString()} />
            </dl>
          ) : null}
          {proof ? <p className="mt-4 text-xs text-muted">Last checked: {new Date(proof.checkedAt).toLocaleString()}</p> : null}
          <div className="mt-7 flex flex-wrap gap-4 font-mono text-xs text-gold">
            <button type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)} className="disabled:opacity-50">Refresh proof</button>
            {proof?.circleUrl ? <a href={proof.circleUrl} target="_blank" rel="noopener noreferrer">Inspect raw Circle record ↗</a> : null}
            {matches && proof?.batchExplorerUrl ? <a href={proof.batchExplorerUrl} target="_blank" rel="noopener noreferrer">View batch transaction on ArcScan ↗</a> : null}
            {!proof?.batchExplorerUrl && record.txHash ? <TransactionProofLink receipt={record} label="Inspect recorded transaction" /> : null}
            <a href={apiUrl(`/api/${kind}/${encodeURIComponent(record.id!)}/verify`)} target="_blank" rel="noopener noreferrer">Public verification JSON ↗</a>
          </div>
          {proof?.batchExplorerUrl ? <p className="mt-3 text-xs text-muted">This transaction settles a batch of payments. Circle’s record identifies this individual payment.</p> : null}
        </dialog>
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
  const value = BigInt(amount);
  const scale = BigInt(1_000_000);
  const fraction = (value % scale).toString().padStart(6, "0").replace(/0+$/, "");
  return `${value / scale}${fraction ? `.${fraction}` : ""}`;
}

export function ReceiptRecordLinks({ receipt }: { receipt: CitationPayment }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href={`/receipts/${receipt.id}`} className="font-mono text-xs text-gold hover:text-cream">Open record</Link>
      <SettlementProof receipt={receipt} />
    </div>
  );
}
