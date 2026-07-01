"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Save, WalletCards } from "lucide-react";
import { registerSource } from "@/api";
import { connectWallet, getSavedWallet } from "@/browser";
import type { Source } from "@/types";

const initialForm = {
  title: "",
  authorName: "",
  sourceUrl: "",
  doiOrCanonicalUrl: "",
  citationPriceUSDC: "0.0001",
  abstract: "",
  tags: "",
  evidenceText: "",
  license: "CC BY 4.0"
};

export function SourceRegistrationForm() {
  const [form, setForm] = useState(initialForm);
  const [walletAddress, setWalletAddress] = useState("");
  const [createdSource, setCreatedSource] = useState<Source>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setWalletAddress(getSavedWallet()), []);

  function update(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function ensureWallet() {
    try {
      setWalletAddress(await connectWallet());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wallet connection failed");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!walletAddress) return ensureWallet();
    setBusy(true);
    setError("");
    try {
      const { source } = await registerSource({ ...form, walletAddress });
      setCreatedSource(source);
      setForm(initialForm);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Source registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <motion.form 
        onSubmit={submit} 
        className="space-y-6"
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
          }
        }}
      >
        <motion.section 
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          className="border-b border-marble/10 pb-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-medium text-cream">Owner wallet</h2>
              <p className="mt-1 text-sm text-muted">Receipts and future settlements are assigned to this address.</p>
            </div>
            <button
              type="button"
              onClick={ensureWallet}
              className="roman-button inline-flex items-center gap-2 border border-marble/15 px-4 py-2.5 font-mono text-xs uppercase text-cream"
            >
              <WalletCards size={15} />
              {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connect wallet"}
            </button>
          </div>
        </motion.section>

        <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <h2 className="font-display text-2xl text-cream">Public metadata</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextField label="Title" value={form.title} onChange={(value) => update("title", value)} required />
            <TextField label="Author or publisher" value={form.authorName} onChange={(value) => update("authorName", value)} required />
            <TextField label="Source URL" type="url" value={form.sourceUrl} onChange={(value) => update("sourceUrl", value)} required />
            <TextField label="DOI or canonical URL" value={form.doiOrCanonicalUrl} onChange={(value) => update("doiOrCanonicalUrl", value)} />
            <TextField
              label="Evidence price in USDC"
              value={form.citationPriceUSDC}
              onChange={(value) => update("citationPriceUSDC", value)}
              required
            />
            <TextField label="License" value={form.license} onChange={(value) => update("license", value)} />
            <div className="sm:col-span-2">
              <TextField label="Tags, comma separated" value={form.tags} onChange={(value) => update("tags", value)} required />
            </div>
          </div>
          <TextArea label="Abstract" value={form.abstract} onChange={(value) => update("abstract", value)} required rows={4} />
        </motion.section>

        <motion.section 
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          className="border-t border-marble/10 pt-6"
        >
          <h2 className="font-display text-2xl text-cream">Protected evidence</h2>
          <p className="mt-2 text-sm text-muted">This text is available to the agent only after the evidence purchase step.</p>
          <TextArea label="Evidence text" value={form.evidenceText} onChange={(value) => update("evidenceText", value)} required rows={10} />
        </motion.section>

        <motion.button
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={busy}
          className="roman-button inline-flex items-center gap-2 bg-gold px-5 py-3 font-mono text-xs font-semibold uppercase text-ink hover:bg-gold-soft transition-colors disabled:opacity-50"
        >
          <Save size={15} />
          {busy ? "Submitting..." : walletAddress ? "Submit for review" : "Connect wallet"}
        </motion.button>
        {error ? <p role="alert" className="border border-danger/40 bg-danger/10 p-3 text-sm text-red-200">{error}</p> : null}
      </motion.form>

      <motion.aside 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="border-l border-marble/10 pl-6"
      >
        <h2 className="font-mono text-xs uppercase text-muted">Review status</h2>
        <AnimatePresence mode="wait">
        {createdSource ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 overflow-hidden"
          >
            <CheckCircle2 size={24} className="text-gold" />
            <p className="mt-3 text-lg text-cream">Submitted for review</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              This source remains excluded from research until an administrator approves it.
            </p>
            <dl className="mt-5 space-y-4 font-mono text-xs">
              <Result label="Source ID" value={createdSource.id} />
              <Result label="Status" value={createdSource.status} />
              <Result label="Price" value={`${createdSource.citationPriceUSDC} USDC`} />
            </dl>
          </motion.div>
        ) : (
          <motion.p 
            key="info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-sm leading-6 text-muted"
          >
            New submissions are checked for duplicate URLs and evidence quality before entering the public registry. Wallet ownership verification is not yet enabled.
          </motion.p>
        )}
        </AnimatePresence>
      </motion.aside>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-xs uppercase text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 w-full border border-marble/15 bg-panel px-3 py-3 text-sm text-cream outline-none focus:border-gold/60"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required,
  rows
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows: number;
}) {
  return (
    <label className="mt-4 block">
      <span className="font-mono text-xs uppercase text-muted">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={rows}
        className="mt-2 w-full resize-y border border-marble/15 bg-panel px-3 py-3 text-sm leading-6 text-cream outline-none focus:border-gold/60"
      />
    </label>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="uppercase text-dim">{label}</dt>
      <dd className="mt-1 break-all text-cream">{value}</dd>
    </div>
  );
}
