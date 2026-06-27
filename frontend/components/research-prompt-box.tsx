"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, WalletCards } from "lucide-react";
import type { ResearchStrategy, Usage } from "@/types";
import {
  ApiError,
  createSearchPaymentIntent,
  getUsage,
  runResearch,
  submitSearchPaymentProof
} from "@/api";
import { connectWallet, getSavedWallet, getSessionId, notifyUsageChanged } from "@/browser";

type ResearchRequest = {
  clientRequestId: string;
  question: string;
  strategy: ResearchStrategy;
};

export function ResearchPromptBox() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [strategy, setStrategy] = useState<ResearchStrategy>("balanced");
  const [sessionId, setSessionId] = useState("");
  const [usage, setUsage] = useState<Usage>();
  const [walletAddress, setWalletAddress] = useState("");
  const [pendingRequest, setPendingRequest] = useState<ResearchRequest>();
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const id = getSessionId();
    const wallet = getSavedWallet();
    setSessionId(id);
    setWalletAddress(wallet);
    getUsage(id, wallet || undefined)
      .then((nextUsage) => {
        setUsage(nextUsage);
        setPaymentRequired(nextUsage.requiresPayment);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load search access"));
  }, []);

  async function executeResearch(
    request: ResearchRequest,
    payment?: { walletAddress: string; searchPaymentId: string }
  ) {
    setStage("Researching approved sources...");
    setError("");
    try {
      const data = await runResearch({ sessionId, ...request, ...payment });
      notifyUsageChanged();
      router.push(`/answer/${data.answerId}`);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 402) {
        const nextUsage = await getUsage(sessionId);
        setUsage(nextUsage);
        setPaymentRequired(true);
      } else {
        setError(cause instanceof Error ? cause.message : "Research failed");
      }
    } finally {
      setStage("");
    }
  }

  async function submitResearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionId || !question.trim()) return;
    const request = {
      clientRequestId: `req_${window.crypto.randomUUID().replaceAll("-", "")}`,
      question: question.trim(),
      strategy
    };
    setPendingRequest(request);
    if (usage?.requiresPayment || paymentRequired) {
      setPaymentRequired(true);
      return;
    }
    await executeResearch(request);
  }

  async function confirmPayment() {
    const request =
      pendingRequest ??
      ({
        clientRequestId: `req_${window.crypto.randomUUID().replaceAll("-", "")}`,
        question: question.trim(),
        strategy
      } satisfies ResearchRequest);
    if (!request.question) return;
    setPendingRequest(request);
    setError("");
    try {
      setStage("Connecting wallet...");
      const wallet = walletAddress || (await connectWallet());
      setWalletAddress(wallet);
      setStage("Creating payment request...");
      const intent = await createSearchPaymentIntent(sessionId, wallet);
      if (intent.paymentMode !== "mock") throw new Error("Real wallet settlement is not enabled in this build");
      setStage("Confirming test payment...");
      const payment = await submitSearchPaymentProof({
        paymentIntentId: intent.paymentIntentId,
        sessionId,
        walletAddress: wallet,
        paymentProof: `mock_x402_${window.crypto.randomUUID()}`,
        txHash: `mock_tx_${window.crypto.randomUUID()}`
      });
      setPaymentRequired(false);
      await executeResearch(request, { walletAddress: wallet, searchPaymentId: payment.searchPaymentId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment failed");
      setStage("");
    }
  }

  const busy = Boolean(stage);

  return (
    <form onSubmit={submitResearch} className="roman-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="font-mono text-xs uppercase text-muted" htmlFor="question">
          Research question
        </label>
        {usage ? (
          <span className="font-mono text-xs text-muted">
            {usage.freeSearchesRemaining > 0
              ? `${usage.freeSearchesRemaining} sponsored searches remaining`
              : `${usage.paidSearchPriceUSDC} test USDC per answer`}
          </span>
        ) : null}
      </div>

      <textarea
        id="question"
        required
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        rows={4}
        placeholder="Ask a focused research question..."
        className="mt-3 w-full resize-y border-0 bg-transparent p-0 text-xl leading-8 text-cream outline-none placeholder:text-dim"
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-marble/10 pt-4">
        <details className="group">
          <summary className="cursor-pointer list-none font-mono text-xs uppercase text-muted hover:text-cream">
            Research settings
          </summary>
          <label className="mt-3 flex items-center gap-3 font-mono text-xs text-muted">
            Strategy
            <select
              value={strategy}
              onChange={(event) => setStrategy(event.target.value as ResearchStrategy)}
              className="border border-marble/15 bg-ink-2 px-3 py-2 text-cream outline-none"
            >
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </label>
        </details>
        <button
          type="submit"
          disabled={busy || !sessionId || !question.trim()}
          className="roman-button inline-flex min-w-32 items-center justify-center gap-2 bg-marble px-5 py-3 font-mono text-xs font-semibold uppercase text-ink transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
        >
          Research <ArrowRight size={15} />
        </button>
      </div>

      {paymentRequired && !stage ? (
        <div className="mt-5 border border-gold/30 bg-gold/5 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 font-medium text-cream">
                <WalletCards size={17} className="text-gold" />
                Review test payment
              </p>
              <p className="mt-1 text-sm text-muted">
                {usage?.paidSearchPriceUSDC ?? "0.01"} test USDC unlocks one answer. No real funds move in mock mode.
              </p>
            </div>
            <button
              type="button"
              onClick={confirmPayment}
              className="roman-button inline-flex items-center justify-center gap-2 bg-gold px-5 py-3 font-mono text-xs font-semibold uppercase text-ink"
            >
              <Check size={15} />
              {walletAddress ? "Confirm & research" : "Connect wallet"}
            </button>
          </div>
        </div>
      ) : null}

      {stage ? (
        <div className="mt-5 flex items-center gap-3 border border-marble/15 bg-ink-2 p-4 text-sm text-marble">
          <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
          {stage}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 border border-danger/40 bg-danger/10 p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </form>
  );
}
