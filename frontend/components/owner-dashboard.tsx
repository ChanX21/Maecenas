"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WalletCards } from "lucide-react";
import { getDashboard, getOwnerSources, type DashboardResponse } from "@/api";
import { connectWallet, getAuthToken, getSavedWallet } from "@/browser";
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
      setError(cause instanceof Error ? cause.message : "Could not load contributor treasury");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const saved = getSavedWallet();
    if (saved && getAuthToken()) {
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
      <div className="roman-panel mx-auto mt-10 max-w-2xl p-8 text-center sm:p-12">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold"><WalletCards size={20} /></span>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-7 text-muted">
          Connect your contributor wallet to manage evidence, review status, and treasury records.
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
      <div className="roman-panel flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <span className="font-mono text-xs text-muted">{`${wallet.slice(0, 8)}...${wallet.slice(-6)}`}</span>
        <button onClick={connect} className="font-mono text-xs uppercase text-gold">Change wallet</button>
      </div>

      {busy ? <p className="mt-8 text-sm text-muted">Opening contributor treasury...</p> : null}
      {dashboard ? (
        <>
          <dl className="mt-5 grid overflow-hidden rounded-xl border border-marble/10 bg-panel/65 sm:grid-cols-3">
            <Metric label="Evidence assets" value={String(sources.length)} />
            <Metric label="Funded unlocks" value={String(dashboard.totalCitationsReceived)} />
            <Metric label="Treasury value" value={`${dashboard.totalUSDCEarned} USDC`} detail="Test records are not settled funds" />
          </dl>

          <section className="roman-panel mt-5 p-5 sm:p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Contributor assets</p>
            <h2 className="mt-2 font-display text-2xl text-cream">Evidence portfolio</h2>
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
                    <p className="mt-1 font-mono text-[11px] text-muted">{source.citationPriceUSDC} USDC per funded unlock</p>
                  </div>
                  <span className={`font-mono text-xs uppercase ${source.status === "approved" ? "text-success" : source.status === "rejected" ? "text-danger" : "text-gold"}`}>
                    {source.status}
                  </span>
                </motion.div>
              )) : <p className="py-5 text-sm text-muted">No evidence submitted from this wallet.</p>}
            </motion.div>
          </section>

          <div className="roman-panel mt-5 p-5 sm:p-7">
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
    <div className="border-b border-marble/10 px-4 py-5 text-center last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="font-mono text-[10px] uppercase text-dim">{label}</dt>
      <dd className="mt-2 text-xl text-cream">{value}</dd>
      {detail ? <dd className="mt-1 text-xs text-muted">{detail}</dd> : null}
    </div>
  );
}
