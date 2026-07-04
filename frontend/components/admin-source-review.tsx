"use client";

import { useState } from "react";
import { Check, ShieldCheck, X } from "lucide-react";
import { getAdminSources, reviewAdminSource, type AdminSource } from "@/api";
import { useMaecenasWallet } from "@/components/wallet/maecenas-wallet-provider";

export function AdminSourceReview() {
  const { address, authenticate, openWallet } = useMaecenasWallet();
  const [sources, setSources] = useState<AdminSource[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);

  async function load() {
    if (!address) {
      openWallet();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await authenticate();
      const result = await getAdminSources();
      setSources(result.sources);
      setConnected(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Admin authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function review(id: string, status: "approved" | "rejected") {
    const reason = status === "rejected" ? window.prompt("Rejection reason") ?? "Source did not pass review" : undefined;
    setBusy(true);
    setError("");
    try {
      await reviewAdminSource(id, status, reason);
      setSources((current) => current.filter((source) => source.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Source review failed");
    } finally {
      setBusy(false);
    }
  }

  if (!connected) {
    return (
      <div className="roman-panel mx-auto mt-10 max-w-xl p-8 text-center">
        <ShieldCheck className="mx-auto text-gold" />
        <p className="mt-4 text-sm leading-6 text-muted">Sign with an Admin Wallet to open the review queue.</p>
        <button onClick={load} disabled={busy} className="roman-button mt-6 bg-gold px-5 py-3 font-mono text-xs font-semibold uppercase text-ink disabled:opacity-50">
          {busy ? "Authenticating..." : "Open review queue"}
        </button>
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-5xl space-y-4">
      {sources.map((source) => (
        <article key={source.id} className="roman-panel p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">{source.authorName}</p>
              <h2 className="mt-2 font-display text-2xl text-cream">{source.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{source.abstract}</p>
              <p className="mt-3 font-mono text-[10px] uppercase text-gold">
                {source.ownershipAttestation ? "Wallet ownership attestation present" : "Ownership attestation missing"}
              </p>
              <details className="mt-4 max-w-2xl rounded-md border border-marble/10 bg-ink-2 p-3">
                <summary className="cursor-pointer font-mono text-[10px] uppercase text-gold">Inspect protected evidence</summary>
                <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-muted">{source.evidencePreview}</p>
              </details>
              <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block font-mono text-xs text-gold">
                Inspect source
              </a>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => review(source.id, "approved")} disabled={busy} className="roman-button inline-flex items-center gap-2 bg-gold px-4 py-2 font-mono text-xs font-semibold uppercase text-ink">
                <Check size={14} /> Approve
              </button>
              <button onClick={() => review(source.id, "rejected")} disabled={busy} className="roman-button inline-flex items-center gap-2 border border-danger/40 px-4 py-2 font-mono text-xs uppercase text-danger">
                <X size={14} /> Reject
              </button>
            </div>
          </div>
        </article>
      ))}
      {!sources.length ? <p className="roman-panel p-8 text-center text-sm text-muted">The review queue is clear.</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
