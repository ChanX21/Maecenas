"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldX } from "lucide-react";
import QRCode from "qrcode";
import { verifyReceipt } from "@/api";
import { SettlementProof } from "@/components/transaction-proof-link";
import { citationPaymentStatusLabel } from "@/lib/arc-explorer";
import type { CitationPayment } from "@/types";

export function PaymentReceiptCard({ receipt }: { receipt: CitationPayment }) {
  const [verified, setVerified] = useState<boolean>();
  const [qrCode, setQrCode] = useState("");

  useEffect(() => {
    verifyReceipt(receipt.id).then((result) => setVerified(result.valid)).catch(() => setVerified(false));
  }, [receipt.id]);

  const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/receipts/${receipt.id}?signature=${encodeURIComponent(receipt.receiptSignature)}`;

  useEffect(() => {
    QRCode.toDataURL(receiptUrl, {
      width: 280,
      margin: 1,
      color: { dark: "#8DD8A8", light: "#101311" }
    }).then(setQrCode).catch(() => setQrCode(""));
  }, [receiptUrl]);

  return (
    <motion.article 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="roman-panel p-6 sm:p-8 relative overflow-hidden group hover:shadow-[0_20px_60px_rgba(141,216,168,0.15)] transition-all duration-500 border-gold/20 hover:border-gold/50"
    >
      <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row items-start justify-between gap-6 relative z-10">
        <div className="flex-1 w-full">
          <p className="font-mono text-[10px] tracking-widest uppercase text-gold">Treasury record</p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl text-cream leading-tight">{receipt.sourceTitle}</h2>
          
          <dl className="mt-8 space-y-4 font-mono text-xs">
            <Row label="Amount" value={`${receipt.amountUSDC} USDC`} />
            <Row label="Recipient" value={receipt.recipientWallet} />
            <Row label="Payer" value={receipt.payerAgent} />
            <Row
              label="Patronage"
              value={receipt.fundedBy === "user_paid_search" ? "Patron-funded commission" : "Maecenas research grant"}
            />
            <Row label="Status" value={citationPaymentStatusLabel(receipt)} />
            <Row label="Network" value={receipt.network ?? "not recorded"} />
            <Row
              label="On-chain proof"
              value={<SettlementProof receipt={receipt} className="text-muted" />}
            />
            <Row label="Timestamp" value={new Date(receipt.createdAt).toLocaleString()} />
          </dl>
        </div>
        
        {/* The QR Code block */}
        <div className="shrink-0 flex flex-col items-center gap-3 w-full sm:w-auto mt-6 sm:mt-0 border-t border-marble/10 pt-6 sm:border-0 sm:pt-0">
          <div className="p-3 bg-ink-2 border border-gold/30 rounded-lg shadow-[0_0_20px_rgba(141,216,168,0.15)] relative group-hover:border-gold/60 transition-colors duration-500">
            {/* The four corners styling */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gold/80" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gold/80" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gold/80" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gold/80" />
            
            {qrCode ? (
              <img
                src={qrCode}
                alt="Treasury record QR"
                className="h-[120px] w-[120px] object-contain opacity-90 transition-opacity group-hover:opacity-100 sm:h-[140px] sm:w-[140px]"
              />
            ) : <div className="h-[120px] w-[120px] animate-pulse bg-marble/5 sm:h-[140px] sm:w-[140px]" />}
          </div>
          <p className={`flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest ${verified ? "text-gold" : "text-muted"}`}>
            {verified ? <ShieldCheck size={11} /> : <ShieldX size={11} />}
            {verified === undefined ? "Verifying record" : verified ? "Signature verified" : "Unverified record"}
          </p>
        </div>
      </div>
    </motion.article>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-white/8 pb-3 sm:grid-cols-[120px_1fr]">
      <dt className="uppercase text-dim">{label}</dt>
      <dd className="break-all text-muted">{value}</dd>
    </div>
  );
}
