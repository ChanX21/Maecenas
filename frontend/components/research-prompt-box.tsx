"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, WalletCards } from "lucide-react";
import { AnimatedResearchLoader } from "@/components/animated-research-loader";
import type { ResearchStrategy, TraceEvent, Usage } from "@/types";
import {
  ApiError,
  createSearchPaymentIntent,
  getResearchRun,
  getUsage,
  runResearch,
  submitSearchPaymentProof
} from "@/api";
import { connectWallet, createCirclePaymentPayload, getAuthToken, getSavedWallet, getSessionId, notifyUsageChanged } from "@/browser";

type ResearchRequest = {
  clientRequestId: string;
  question: string;
  strategy: ResearchStrategy;
  budgetUSDC: string;
};

export function ResearchPromptBox() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [strategy, setStrategy] = useState<ResearchStrategy>("balanced");
  const [budgetUSDC, setBudgetUSDC] = useState("0.0050");
  const [sessionId, setSessionId] = useState("");
  const [usage, setUsage] = useState<Usage>();
  const [walletAddress, setWalletAddress] = useState("");
  const [pendingRequest, setPendingRequest] = useState<ResearchRequest>();
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [stage, setStage] = useState("");
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = getSessionId();
    const wallet = getAuthToken() ? getSavedWallet() : "";
    setSessionId(id);
    setWalletAddress(wallet);
    getUsage(id, wallet || undefined)
      .then((nextUsage) => {
        setUsage(nextUsage);
        setPaymentRequired(nextUsage.requiresPayment);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load research access"));
  }, []);

  async function executeResearch(
    request: ResearchRequest,
    payment?: { walletAddress: string; searchPaymentId: string }
  ) {
    setStage("Scouting the approved archive...");
    setEvents([]);
    setError("");
    try {
      const data = await runResearch({ sessionId, ...request, ...payment });
      let answerId = data.answerId;
      if (data.status === "processing" && data.runId) {
        setStage("Research commission is in the queue...");
        for (let attempt = 0; attempt < 80; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
          const run = await getResearchRun(data.runId, sessionId);
          if (run.status === "failed") throw new Error("Research commission failed");
          if (run.events) setEvents(run.events);
          if (run.status === "completed") {
            answerId = run.answerId;
            break;
          }
        }
      }
      if (!answerId) throw new Error("Research timed out while waiting for the worker");
      notifyUsageChanged();
      router.push(`/answer/${answerId}`);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 402) {
        const nextUsage = await getUsage(sessionId);
        setUsage(nextUsage);
        setPaymentRequired(true);
      } else {
        setError(cause instanceof Error ? cause.message : "Research commission failed");
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
      strategy,
      budgetUSDC
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
        strategy,
        budgetUSDC
      } satisfies ResearchRequest);
    if (!request.question) return;
    setPendingRequest(request);
    setError("");
    try {
      setStage("Connecting wallet...");
      const wallet = walletAddress || (await connectWallet());
      setWalletAddress(wallet);
      setStage("Opening treasury request...");
      const intent = await createSearchPaymentIntent(sessionId, wallet);
      const paymentPayload =
        intent.paymentMode === "real"
          ? await createCirclePaymentPayload(intent.paymentRequired!)
          : undefined;
      setStage(intent.paymentMode === "real" ? "Settling with Circle Gateway..." : "Recording test settlement...");
      const payment = await submitSearchPaymentProof({
        paymentIntentId: intent.paymentIntentId,
        sessionId,
        walletAddress: wallet,
        paymentProof: paymentPayload ? "" : `mock_x402_${window.crypto.randomUUID()}`,
        paymentPayload,
        txHash: paymentPayload ? undefined : `mock_tx_${window.crypto.randomUUID()}`
      });
      setPaymentRequired(false);
      await executeResearch(request, { walletAddress: wallet, searchPaymentId: payment.searchPaymentId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Treasury settlement failed");
      setStage("");
    }
  }

  const busy = Boolean(stage);

  return (
    <form onSubmit={submitResearch} className="roman-panel overflow-hidden p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="font-mono text-xs uppercase text-muted" htmlFor="question">
          Research mandate
        </label>
        {usage ? (
          <span className="font-mono text-xs text-muted">
            {usage.freeSearchesRemaining > 0
              ? `${usage.freeSearchesRemaining} patron-funded commissions left`
              : `${usage.paidSearchPriceUSDC} USDC per commission`}
          </span>
        ) : null}
      </div>

      <textarea
        id="question"
        required
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        rows={3}
        placeholder="What should the forum investigate?"
        className="mt-4 w-full resize-y border-0 bg-transparent p-0 font-display text-2xl leading-9 text-cream outline-none placeholder:text-dim sm:text-3xl"
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-marble/10 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-md border border-marble/10 bg-ink-2 px-3 py-2 font-mono text-[11px] text-muted">
            Posture
            <select
              value={strategy}
              onChange={(event) => setStrategy(event.target.value as ResearchStrategy)}
              className="bg-transparent text-cream outline-none"
            >
              <option value="conservative">Focused</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Expansive</option>
            </select>
          </label>
          <details className="group relative">
          <summary className="cursor-pointer list-none rounded-md border border-marble/10 bg-ink-2 px-3 py-2 font-mono text-[11px] text-muted hover:text-cream">
            Budget · <span className="text-gold">{budgetUSDC} USDC</span>
          </summary>
            <div className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-lg border border-marble/15 bg-panel-2 p-3 shadow-2xl">
              <div className="flex justify-between font-mono text-xs uppercase tracking-wider text-muted">
                <span>Treasury limit</span>
                <span className="text-gold font-bold">{budgetUSDC} USDC</span>
              </div>
              <input
                type="range"
                min="0.0001"
                max="0.0100"
                step="0.0001"
                value={budgetUSDC}
                onChange={(e) => setBudgetUSDC(Number(e.target.value).toFixed(4))}
                className="mt-3 w-full accent-gold h-1 bg-marble/10 rounded-lg appearance-none cursor-pointer"
              />
              <div className="mt-1 flex justify-between font-mono text-[9px] text-dim">
                <span>0.0001 min</span>
                <span>0.0100 max</span>
              </div>
            </div>
          </details>
          <span className="rounded-md border border-marble/10 bg-ink-2 px-3 py-2 font-mono text-[11px] text-muted">
            Curated sources
          </span>
        </div>
        <motion.button
          type="submit"
          disabled={busy || !sessionId || !question.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="roman-button inline-flex min-w-32 items-center justify-center gap-2 bg-gold px-5 py-3 font-mono text-xs font-semibold uppercase text-ink transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          Commission research <ArrowRight size={15} />
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {stage && <AnimatedResearchLoader key="research-loader" stage={stage} events={events} />}

        {!stage && paymentRequired ? (
          <motion.div
            key="payment-box"
            initial={{ opacity: 0, height: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
            exit={{ opacity: 0, height: 0, filter: "blur(4px)" }}
            transition={{ type: "spring", bounce: 0.3 }}
            className="mt-5 overflow-hidden"
          >
            <div className="border border-gold/30 bg-gold/5 p-4 rounded-xl shadow-[0_10px_30px_rgba(212,175,55,0.05)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 font-medium text-cream">
                    <WalletCards size={17} className="text-gold" />
                    Fund this commission
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {usage?.paidSearchPriceUSDC ?? "0.01"} USDC funds one research run. Live settlement is off in this build.
                  </p>
                </div>
                <motion.button
                  type="button"
                  onClick={confirmPayment}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="roman-button inline-flex items-center justify-center gap-2 bg-gold px-5 py-3 font-mono text-xs font-semibold uppercase text-ink hover:bg-gold-soft transition-colors"
                >
                  <Check size={15} />
                  {walletAddress ? "Fund and launch" : "Connect wallet"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>


      {error ? (
        <p role="alert" className="mt-4 border border-danger/40 bg-danger/10 p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-marble/10 pt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-dim">
        <span><i className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-gold" />Archive online</span>
        <span>Budget governed</span>
        <span>Receipts recorded</span>
      </div>
    </form>
  );
}
