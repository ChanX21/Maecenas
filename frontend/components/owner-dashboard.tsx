"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, LoaderCircle, WalletCards } from "lucide-react";
import {
  getDashboard,
  getGatewayWithdrawalQuote,
  getOwnerSources,
  withdrawGatewayBalance,
  type DashboardResponse
} from "@/api";
import { useMaecenasWallet } from "@/components/wallet/maecenas-wallet-provider";
import { DashboardEarningsTable } from "@/components/dashboard-earnings-table";
import { arcExplorerTxUrl, shortenTxHash } from "@/lib/arc-explorer";
import type { GatewayWithdrawalQuote, Source } from "@/types";

export function OwnerDashboard() {
  const { address, authenticate, openWallet, signGatewayWithdrawal } = useMaecenasWallet();
  const [wallet, setWallet] = useState("");
  const [dashboard, setDashboard] = useState<DashboardResponse>();
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [withdrawal, setWithdrawal] = useState<GatewayWithdrawalQuote>();
  const [withdrawalError, setWithdrawalError] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawalTx, setWithdrawalTx] = useState("");

  async function load(address: string) {
    setBusy(true);
    setError("");
    try {
      const [nextDashboard, ownerSources] = await Promise.all([getDashboard(address), getOwnerSources(address)]);
      setDashboard(nextDashboard);
      setSources(ownerSources.sources);
      if (nextDashboard.paymentMode === "real") {
        try {
          setWithdrawal(await getGatewayWithdrawalQuote(address));
        } catch (cause) {
          setWithdrawalError(cause instanceof Error ? cause.message : "Could not load Circle Gateway balance");
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load contributor treasury");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!withdrawal?.canWithdraw || !withdrawal.burnIntent || !wallet) return;
    setWithdrawing(true);
    setWithdrawalError("");
    try {
      const authenticatedWallet = await authenticate();
      const signature = await signGatewayWithdrawal(withdrawal.burnIntent);
      const result = await withdrawGatewayBalance({
        walletAddress: authenticatedWallet,
        burnIntent: withdrawal.burnIntent,
        signature
      });
      setWithdrawalTx(result.txHash);
      await load(authenticatedWallet);
    } catch (cause) {
      setWithdrawalError(cause instanceof Error ? cause.message : "Gateway withdrawal failed");
    } finally {
      setWithdrawing(false);
    }
  }

  useEffect(() => {
    if (!address) {
      setWallet("");
      setDashboard(undefined);
      setSources([]);
      setWithdrawal(undefined);
      setWithdrawalTx("");
      return;
    }

    void authenticate()
      .then((authenticatedWallet) => {
        setWallet(authenticatedWallet);
        return load(authenticatedWallet);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Wallet authentication failed");
      });
  }, [address, authenticate]);

  async function connect() {
    if (!address) {
      openWallet();
      return;
    }
    try {
      const authenticatedWallet = await authenticate();
      setWallet(authenticatedWallet);
      await load(authenticatedWallet);
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
          <WalletCards size={15} /> Connect with Dynamic
        </button>
        {error ? <p className="mt-4 text-sm text-red-200">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="roman-panel flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <span className="font-mono text-xs text-muted">{`${wallet.slice(0, 8)}...${wallet.slice(-6)}`}</span>
        <button onClick={openWallet} className="font-mono text-xs uppercase text-gold">Wallet details</button>
      </div>

      {busy ? <p className="mt-8 text-sm text-muted">Opening contributor treasury...</p> : null}
      {dashboard ? (
        <>
          <dl className="mt-5 grid overflow-hidden rounded-xl border border-marble/10 bg-panel/65 sm:grid-cols-3">
            <Metric label="Evidence assets" value={String(sources.length)} />
            <Metric label="Funded unlocks" value={String(dashboard.totalCitationsReceived)} />
            <Metric
              label="Treasury value"
              value={`${dashboard.totalUSDCEarned} USDC`}
              detail={
                dashboard.paymentMode === "real"
                  ? "Circle Gateway credit; withdraw it to receive USDC in this wallet"
                  : "Test records are not settled funds"
              }
            />
          </dl>

          {dashboard.paymentMode === "real" && withdrawal ? (
            <section className="roman-panel mt-5 p-5 sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Circle Gateway withdrawal</p>
                  <p className="mt-2 font-mono text-sm text-cream">
                    {withdrawal.balanceUSDC} USDC available · {withdrawal.feeUSDC} USDC estimated fee
                  </p>
                  {!withdrawal.canWithdraw ? (
                    <p className="mt-2 text-xs text-muted">
                      Withdrawal becomes available at {withdrawal.minimumBalanceUSDC ?? "a positive balance"} USDC.
                    </p>
                  ) : null}
                  {withdrawalTx ? (
                    <a
                      href={arcExplorerTxUrl(withdrawalTx)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 font-mono text-xs text-gold hover:text-cream"
                    >
                      {shortenTxHash(withdrawalTx)} <ArrowUpRight size={12} />
                    </a>
                  ) : null}
                  {withdrawalError ? <p className="mt-2 text-xs text-danger">{withdrawalError}</p> : null}
                </div>
                <button
                  type="button"
                  disabled={!withdrawal.canWithdraw || withdrawing}
                  onClick={withdraw}
                  className="roman-button inline-flex min-h-11 items-center justify-center gap-2 bg-gold px-5 py-3 font-mono text-xs font-semibold uppercase text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {withdrawing ? <LoaderCircle className="animate-spin" size={15} /> : <WalletCards size={15} />}
                  {withdrawing ? "Withdrawing" : `Withdraw ${withdrawal.amountUSDC} USDC`}
                </button>
              </div>
            </section>
          ) : null}

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
