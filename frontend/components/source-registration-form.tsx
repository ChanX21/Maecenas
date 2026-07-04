"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Save, WalletCards, ChevronDown } from "lucide-react";
import { registerSource } from "@/api";
import { connectWallet, getAuthToken, getSavedWallet, signSourceOwnership } from "@/browser";
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

  useEffect(() => setWalletAddress(getAuthToken() ? getSavedWallet() : ""), []);

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
      const ownershipAttestation = await signSourceOwnership(form.sourceUrl);
      const { source } = await registerSource({ ...form, walletAddress, ownershipAttestation });
      setCreatedSource(source);
      setForm(initialForm);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Evidence submission failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <motion.form 
        onSubmit={submit} 
        className="roman-panel space-y-7 p-5 sm:p-7"
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
              <h2 className="text-base font-medium text-cream">Contributor wallet</h2>
              <p className="mt-1 text-sm text-muted">Treasury records and future settlements belong to this address.</p>
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
          <h2 className="font-display text-2xl text-cream">Public source record</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextField label="Title" value={form.title} onChange={(value) => update("title", value)} required />
            <TextField label="Author or publisher" value={form.authorName} onChange={(value) => update("authorName", value)} required />
            <TextField label="Source URL" type="url" value={form.sourceUrl} onChange={(value) => update("sourceUrl", value)} required />
            <TextField label="DOI or canonical URL" value={form.doiOrCanonicalUrl} onChange={(value) => update("doiOrCanonicalUrl", value)} />
            <div className="block">
              <span className="font-mono text-xs uppercase text-muted">Unlock price in USDC</span>
              <div className="mt-2 flex flex-col gap-2">
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={form.citationPriceUSDC}
                  onChange={(e) => update("citationPriceUSDC", e.target.value)}
                  required
                  className="w-full rounded-md border border-marble/10 bg-ink-2 px-3 py-3 text-sm text-cream outline-none transition focus:border-gold/60"
                />
                <div>
                  <input
                    type="range"
                    min="0.0001"
                    max="0.0100"
                    step="0.0001"
                    value={form.citationPriceUSDC}
                    onChange={(e) => update("citationPriceUSDC", Number(e.target.value).toFixed(4))}
                    className="w-full accent-gold h-1 bg-marble/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="mt-1 flex justify-between font-mono text-[9px] text-dim">
                    <span>0.0001 min</span>
                    <span>0.0100 max</span>
                  </div>
                </div>
              </div>
            </div>
            <SelectField 
              label="License" 
              value={form.license} 
              onChange={(value) => update("license", value)} 
              options={["CC BY 4.0", "CC BY-SA 4.0", "MIT", "Apache 2.0", "BSD", "Public Domain (CC0)", "Proprietary"]}
            />
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
          <h2 className="font-display text-2xl text-cream">Fundable evidence</h2>
          <p className="mt-2 text-sm text-muted">Maecenas unlocks this material only when it is selected and funded for a commission.</p>
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
          {busy ? "Sending to the forum..." : walletAddress ? "Submit to the forum" : "Connect wallet"}
        </motion.button>
        {error ? <p role="alert" className="border border-danger/40 bg-danger/10 p-3 text-sm text-red-200">{error}</p> : null}
      </motion.form>

      <motion.aside 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="roman-panel h-fit p-5 sm:p-6 lg:sticky lg:top-24"
      >
        <h2 className="font-mono text-xs uppercase text-muted">Forum review</h2>
        <AnimatePresence mode="wait">
        {createdSource ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 overflow-hidden"
          >
            <CheckCircle2 size={24} className="text-gold" />
            <p className="mt-3 text-lg text-cream">Entered into review</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              The source enters the funded archive after an administrator approves it.
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
            The forum checks every submission for duplicate URLs and evidence quality before it enters the public archive. Wallet ownership verification is not yet enabled.
          </motion.p>
        )}
        </AnimatePresence>
      </motion.aside>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="font-mono text-xs uppercase text-muted">{label}</span>
      <div className="relative mt-2">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-marble/10 bg-ink-2 px-3 py-3 text-sm text-cream outline-none transition focus:border-gold/60 appearance-none pr-10"
        >
          <option value="" disabled>Select a license</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
          <ChevronDown size={16} />
        </div>
      </div>
    </label>
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
        className="mt-2 w-full rounded-md border border-marble/10 bg-ink-2 px-3 py-3 text-sm text-cream outline-none transition focus:border-gold/60"
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
        className="mt-2 w-full resize-y rounded-md border border-marble/10 bg-ink-2 px-3 py-3 text-sm leading-6 text-cream outline-none transition focus:border-gold/60"
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
