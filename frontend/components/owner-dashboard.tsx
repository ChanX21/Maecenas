"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WalletCards } from "lucide-react";
import { getDashboard, getOwnerSources, type DashboardResponse } from "@/api";
import { connectWallet, getSavedWallet } from "@/browser";
import { DashboardEarningsTable } from "@/components/dashboard-earnings-table";
import type { Source } from "@/types";

export function OwnerDashboard() {
  const [wallet, setWallet] = useState("");
  const [dashboard, setDashboard] = useState<DashboardResponse>();
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(address: string) {
    setBusy(true);
    setError("");
    try {
      const [nextDashboard, ownerSources] = await Promise.all([getDashboard(address), getOwnerSources(address)]);
      setDashboard(nextDashboard);
      setSources(ownerSources.sources);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load owner dashboard");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const saved = getSavedWallet();
    if (saved) {
      setWallet(saved);
      void load(saved);
    }
  }, []);

  async function connect() {
    try {
      const address = await connectWallet();
      setWallet(address);
      await load(address);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wallet connection failed");
    }
  }

  if (!wallet) {
    return (
      <div className="mt-10 border-y border-marble/10 py-10">
        <p className="max-w-xl text-lg leading-7 text-muted">
          Connect the source-owner wallet to view submissions, review status and evidence receipts.
        </p>
        <button
          onClick={connect}
          className="roman-button mt-6 inline-flex items-center gap-2 bg-gold px-5 py-3 font-mono text-xs font-semibold uppercase text-ink"
        >
          <WalletCards size={15} /> Connect wallet
        </button>
        {error ? <p className="mt-4 text-sm text-red-200">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-marble/10 py-4">
        <span className="font-mono text-xs text-muted">{`${wallet.slice(0, 8)}...${wallet.slice(-6)}`}</span>
        <button onClick={connect} className="font-mono text-xs uppercase text-gold">Change wallet</button>
      </div>

      {busy ? <p className="mt-8 text-sm text-muted">Loading owner records...</p> : null}
      {dashboard ? (
        <>
          <dl className="mt-8 grid border-y border-marble/10 sm:grid-cols-3">
            <Metric label="Registered sources" value={String(sources.length)} />
            <Metric label="Evidence purchases" value={String(dashboard.totalCitationsReceived)} />
            <Metric label="Recorded value" value={`${dashboard.totalUSDCEarned} USDC`} detail="Mock/test receipts are not settled funds" />
          </dl>

          <section className="mt-10">
            <h2 className="font-display text-2xl text-cream">Source submissions</h2>
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              className="mt-4 divide-y divide-marble/10 border-t border-marble/10"
            >
              {sources.length ? sources.map((source) => (
                <motion.div 
                  variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                  key={source.id} 
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm text-cream">{source.title}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted">{source.citationPriceUSDC} USDC per evidence purchase</p>
                  </div>
                  <span className={`font-mono text-xs uppercase ${source.status === "approved" ? "text-success" : source.status === "rejected" ? "text-danger" : "text-gold"}`}>
                    {source.status}
                  </span>
                </motion.div>
              )) : <p className="py-5 text-sm text-muted">No sources registered for this wallet.</p>}
            </motion.div>
          </section>

          <div className="mt-10">
            <DashboardEarningsTable receipts={dashboard.latestPaidCitations} />
          </div>
        </>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-200">{error}</p> : null}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="border-b border-marble/10 px-4 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="font-mono text-[10px] uppercase text-dim">{label}</dt>
      <dd className="mt-2 text-xl text-cream">{value}</dd>
      {detail ? <dd className="mt-1 text-xs text-muted">{detail}</dd> : null}
    </div>
  );
}
