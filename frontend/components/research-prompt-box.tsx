"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, WalletCards } from "lucide-react";
import type { ResearchStrategy, Usage } from "@/types";
import {
  ApiError,
  createSearchPaymentIntent,
  getUsage,
  runResearch,
  submitSearchPaymentProof
} from "@/api";

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

type ResearchRequest = {
  clientRequestId: string;
  question: string;
  budgetUSDC: string;
  strategy: ResearchStrategy;
};

export function ResearchPromptBox() {
  const router = useRouter();
  const [question, setQuestion] = useState("Explain why nanopayments matter for AI agents.");
  const [budgetUSDC, setBudgetUSDC] = useState("0.01");
  const [strategy, setStrategy] = useState<ResearchStrategy>("balanced");
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [usage, setUsage] = useState<Usage>();
  const [error, setError] = useState("");
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [pendingRequest, setPendingRequest] = useState<ResearchRequest>();

  useEffect(() => {
    const existing = window.localStorage.getItem("maecenas_session_id");
    const id = existing ?? `sess_${window.crypto.randomUUID().replaceAll("-", "")}`;
    if (!existing) window.localStorage.setItem("maecenas_session_id", id);
    setSessionId(id);
    getUsage(id)
      .then((nextUsage) => {
        setUsage(nextUsage);
        setPaymentRequired(nextUsage.requiresPayment);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load search quota"));
  }, []);

  async function executeResearch(
    request: ResearchRequest,
    payment?: { walletAddress: string; searchPaymentId: string }
  ) {
    setLoading(true);
    setError("");
    setStepIndex(0);
    const timer = window.setInterval(() => {
      setStepIndex((current) => Math.min(current + 1, loadingSteps.length - 1));
    }, 420);

    try {
      const data = await runResearch({
        sessionId,
        ...request,
        ...payment
      });
      router.push(`/answer/${data.answerId}`);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 402) {
        setPaymentRequired(true);
        setUsage(await getUsage(sessionId));
      } else {
        setError(cause instanceof Error ? cause.message : "Research failed");
      }
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
  }

  async function submitResearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionId) return;
    const request = {
      clientRequestId: `req_${window.crypto.randomUUID().replaceAll("-", "")}`,
      question,
      budgetUSDC,
      strategy
    };
    setPendingRequest(request);
    if (usage?.requiresPayment || paymentRequired) {
      setPaymentRequired(true);
      return;
    }
    await executeResearch(request);
  }

  async function connectAndPay() {
    const request =
      pendingRequest ??
      ({
        clientRequestId: `req_${window.crypto.randomUUID().replaceAll("-", "")}`,
        question,
        budgetUSDC,
        strategy
      } satisfies ResearchRequest);
    setPendingRequest(request);
    setPaymentLoading(true);
    setError("");
    try {
      const ethereum = (window as Window & {
        ethereum?: { request(input: { method: string }): Promise<unknown> };
      }).ethereum;
      if (!ethereum) throw new Error("An EVM wallet is required to continue");
      const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const wallet = accounts[0]?.toLowerCase();
      if (!wallet) throw new Error("Wallet connection was not approved");
      setWalletAddress(wallet);
      const intent = await createSearchPaymentIntent(sessionId, wallet);
      if (intent.paymentMode !== "mock") throw new Error("Real wallet payments are not enabled yet");
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
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <form onSubmit={submitResearch} className="roman-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="font-mono text-xs uppercase tracking-[0.18em] text-marble/75" htmlFor="question">
          Research question
        </label>
        {usage ? (
          <span className="font-mono text-xs uppercase text-muted">
            {usage.freeSearchesRemaining > 0
              ? `${usage.freeSearchesRemaining} free searches left`
              : `${usage.paidSearchPriceUSDC} test USDC per search`}
          </span>
        ) : null}
      </div>
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
          disabled={loading || paymentLoading || !sessionId}
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
      {paymentRequired && !loading ? (
        <div className="mt-5 flex flex-col gap-3 border border-marble/20 bg-ink-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl text-cream">Connect wallet to continue</p>
            <p className="mt-1 font-mono text-xs uppercase text-muted">
              {usage?.paidSearchPriceUSDC ?? "0.01"} test USDC for this research answer
            </p>
          </div>
          <button
            type="button"
            onClick={connectAndPay}
            disabled={paymentLoading || !sessionId}
            className="roman-button inline-flex items-center justify-center gap-2 bg-marble px-5 py-3 font-mono text-xs font-semibold uppercase text-ink transition hover:bg-cream disabled:opacity-70"
          >
            <WalletCards size={16} />
            {paymentLoading ? "Connecting..." : walletAddress ? "Pay & research" : "Connect wallet"}
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </form>
  );
}
