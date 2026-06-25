"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import type { Source } from "@/types";
import { apiUrl } from "@/api";

const initialForm = {
  title: "",
  authorName: "",
  sourceUrl: "",
  doiOrCanonicalUrl: "",
  walletAddress: "",
  citationPriceUSDC: "0.0001",
  abstract: "",
  tags: "agents, payments, x402",
  evidenceText: "",
  license: "CC BY 4.0"
};

export function SourceRegistrationForm() {
  const [form, setForm] = useState(initialForm);
  const [createdSource, setCreatedSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch(apiUrl("/api/sources"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) throw new Error(data.error ?? "Failed to register source");
    setCreatedSource(data.source);
    setForm(initialForm);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <form onSubmit={submit} className="roman-panel p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Title" value={form.title} onChange={(value) => update("title", value)} required />
          <TextField label="Author name" value={form.authorName} onChange={(value) => update("authorName", value)} required />
          <TextField label="Source URL" value={form.sourceUrl} onChange={(value) => update("sourceUrl", value)} required />
          <TextField label="DOI or canonical URL" value={form.doiOrCanonicalUrl} onChange={(value) => update("doiOrCanonicalUrl", value)} />
          <TextField label="Owner wallet" value={form.walletAddress} onChange={(value) => update("walletAddress", value)} required />
          <TextField label="Citation price USDC" value={form.citationPriceUSDC} onChange={(value) => update("citationPriceUSDC", value)} required />
          <TextField label="Tags" value={form.tags} onChange={(value) => update("tags", value)} required />
          <TextField label="License" value={form.license} onChange={(value) => update("license", value)} />
        </div>
        <TextArea label="Abstract" value={form.abstract} onChange={(value) => update("abstract", value)} required rows={4} />
        <TextArea label="Protected evidence text" value={form.evidenceText} onChange={(value) => update("evidenceText", value)} required rows={8} />
        <button
          type="submit"
          disabled={loading}
          className="roman-button mt-5 inline-flex items-center gap-2 bg-gold px-5 py-3 font-mono text-xs font-semibold uppercase text-ink transition hover:bg-gold-soft disabled:opacity-70"
        >
          <Save size={16} />
          Register Source
        </button>
      </form>
      <aside className="roman-panel p-5">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-gold">MVP note</p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Mecenas does not verify academic ownership yet. This demo shows how agentic citation payments can work once
          sources are registered.
        </p>
        {createdSource ? (
          <div className="mt-6 space-y-3 border-t border-white/10 pt-5 font-mono text-xs">
            <Result label="Source ID" value={createdSource.id} />
            <Result label="Citation price" value={`${createdSource.citationPriceUSDC} USDC`} />
            <Result label="Owner wallet" value={createdSource.walletAddress} />
            <Result label="Public source page" value={`/sources#${createdSource.id}`} />
            <Result label="Protected endpoint" value={apiUrl(`/api/sources/${createdSource.id}/evidence`)} />
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-xs uppercase text-muted">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 w-full border border-white/10 bg-ink-2 px-3 py-3 font-mono text-sm text-cream outline-none focus:border-gold/50"
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
        className="mt-2 w-full resize-none border border-white/10 bg-ink-2 px-3 py-3 text-sm leading-6 text-cream outline-none focus:border-gold/50"
      />
    </label>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="uppercase text-dim">{label}</p>
      <p className="mt-1 break-all text-cream">{value}</p>
    </div>
  );
}
