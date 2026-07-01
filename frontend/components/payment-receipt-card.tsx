"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { CitationPayment } from "@/types";

export function PaymentReceiptCard({ receipt }: { receipt: CitationPayment }) {
  return (
    <motion.article 
      initial={{ opacity: 0, scale: 1.1, y: -20, rotate: -1 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25, bounce: 0.5 }}
      className="roman-panel p-6 sm:p-8 relative overflow-hidden group hover:shadow-[0_20px_60px_rgba(141,216,168,0.15)] transition-all duration-500 border-gold/20 hover:border-gold/50"
    >
      <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row items-start justify-between gap-6 relative z-10">
        <div className="flex-1 w-full">
          <p className="font-mono text-[10px] tracking-widest uppercase text-gold">Cryptographic Receipt</p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl text-cream leading-tight">{receipt.sourceTitle}</h2>
          
          <dl className="mt-8 space-y-4 font-mono text-xs">
            <Row label="Amount" value={`${receipt.amountUSDC} USDC`} />
            <Row label="Recipient" value={receipt.recipientWallet} />
            <Row label="Payer" value={receipt.payerAgent} />
            <Row
              label="Funded by"
              value={receipt.fundedBy === "user_paid_search" ? "User-funded research budget" : "Maecenas sponsored budget"}
            />
            <Row label="Status" value={receipt.status === "mock" ? "Mock x402 / test USDC" : receipt.status} />
            <Row label="Payment ID" value={receipt.paymentId ?? "pending"} />
            <Row label="Timestamp" value={new Date(receipt.createdAt).toLocaleString()} />
          </dl>
          <Link href={`/receipts/${receipt.id}`} className="mt-8 inline-block font-mono text-xs uppercase text-gold hover:text-gold-soft transition-colors hover:underline underline-offset-4">
            View full ledger entry →
          </Link>
        </div>
        
        {/* The QR Code block */}
        <div className="shrink-0 flex flex-col items-center gap-3 w-full sm:w-auto mt-6 sm:mt-0 border-t border-marble/10 pt-6 sm:border-0 sm:pt-0">
          <div className="p-3 bg-ink-2 border border-gold/30 rounded-lg shadow-[0_0_20px_rgba(141,216,168,0.15)] relative group-hover:border-gold/60 transition-colors duration-500">
            {/* The four corners styling */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gold/80" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gold/80" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gold/80" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gold/80" />
            
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=maecenas:receipt:${receipt.id}&color=8DD8A8&bgcolor=101311`}
              alt="Cryptographic Proof QR"
              className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] mix-blend-screen opacity-90 group-hover:opacity-100 transition-opacity object-contain"
            />
          </div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-gold/60">Proof of Work</p>
        </div>
      </div>
    </motion.article>
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
