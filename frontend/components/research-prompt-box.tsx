"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { ResearchStrategy } from "@/backend/types";
import { apiUrl } from "@/frontend/api";

const loadingSteps = [
  "Planning research...",
  "Searching source registry...",
  "Scoring candidate sources...",
  "Allocating budget...",
  "Requesting paid evidence...",
  "402 Payment Required...",
  "Sending USDC nanopayment...",
  "Evidence unlocked...",
  "Writing cited answer...",
  "Recording receipt..."
];

export function ResearchPromptBox() {
  const router = useRouter();
  const [question, setQuestion] = useState("Explain why nanopayments matter for AI agents.");
  const [budgetUSDC, setBudgetUSDC] = useState("0.01");
  const [strategy, setStrategy] = useState<ResearchStrategy>("balanced");
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  async function submitResearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStepIndex(0);
    const timer = window.setInterval(() => {
      setStepIndex((current) => Math.min(current + 1, loadingSteps.length - 1));
    }, 420);

    try {
      const response = await fetch(apiUrl("/api/research"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, budgetUSDC, strategy })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Research failed");
      router.push(`/answer/${data.answerId}`);
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submitResearch} className="roman-panel p-5">
      <label className="font-mono text-xs uppercase tracking-[0.18em] text-marble/75" htmlFor="question">
        Research question
      </label>
      <textarea
        id="question"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        rows={5}
        className="mt-3 w-full resize-none border border-marble/10 bg-ink-2 p-4 text-lg leading-7 text-cream outline-none transition placeholder:text-dim focus:border-marble/50"
      />
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1.2fr_auto]">
        <label className="block">
          <span className="font-mono text-xs uppercase text-muted">Budget USDC</span>
          <input
            value={budgetUSDC}
            onChange={(event) => setBudgetUSDC(event.target.value)}
            className="mt-2 w-full border border-marble/10 bg-ink-2 px-3 py-3 font-mono text-sm text-cream outline-none focus:border-marble/50"
          />
        </label>
        <label className="block">
          <span className="font-mono text-xs uppercase text-muted">Strategy</span>
          <select
            value={strategy}
            onChange={(event) => setStrategy(event.target.value as ResearchStrategy)}
            className="mt-2 w-full border border-marble/10 bg-ink-2 px-3 py-3 font-mono text-sm text-cream outline-none focus:border-marble/50"
          >
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="roman-button mt-6 inline-flex items-center justify-center gap-2 bg-marble px-5 py-3 font-mono text-xs font-semibold uppercase text-ink transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-70 sm:mt-auto"
        >
          <Search size={16} />
          Ask
        </button>
      </div>
      {loading ? (
        <div className="mt-5 border border-marble/20 bg-marble/10 p-4 font-mono text-sm text-marble">
          {loadingSteps[stepIndex]}
        </div>
      ) : null}
    </form>
  );
}
