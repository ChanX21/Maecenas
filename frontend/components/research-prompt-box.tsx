"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, ArrowUpRight, BrainCircuit, ChevronDown, CircleDollarSign, Microscope, Orbit, SlidersHorizontal } from "lucide-react";
import { AnimatedResearchLoader } from "@/components/animated-research-loader";
import { ResearchPaymentGate } from "@/components/research-payment-gate";
import type { ResearchStrategy, TraceEvent, Usage } from "@/types";
import {
  ApiError,
  createSearchPaymentIntent,
  getLeaderboard,
  getResearchRun,
  getUsage,
  runResearch,
  submitSearchPaymentProof
} from "@/api";
import { getSessionId, notifyUsageChanged } from "@/lib/browser-session";
import { prepareAnswerOnboardingTour } from "@/lib/onboarding";
import { useHydrated } from "@/lib/use-hydrated";
import { useMaecenasWallet } from "@/components/wallet/maecenas-wallet-provider";

type ResearchRequest = {
  clientRequestId: string;
  question: string;
  strategy: ResearchStrategy;
  budgetUSDC: string;
};

const exampleQuestions = [
  { title: "Understand AI", description: "The ideas behind transformer models", question: "Why are transformer models effective for modern AI systems?", icon: BrainCircuit },
  { title: "Explore gene editing", description: "What the evidence says about CRISPR", question: "What evidence supports CRISPR-Cas9 as a programmable gene-editing tool?", icon: Microscope },
  { title: "Look beyond Earth", description: "How life adapts to spaceflight", question: "How does spaceflight affect microbial survival and behavior?", icon: Orbit }
];

const researchStrategies: { value: ResearchStrategy; label: string }[] = [
  { value: "conservative", label: "Focused" },
  { value: "balanced", label: "Balanced" },
  { value: "aggressive", label: "Expansive" }
];

export function ResearchPromptBox() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { data: ledger } = useQuery({ queryKey: ["leaderboard"], queryFn: getLeaderboard, retry: false });
  const featuredAnswerId = hydrated ? ledger?.recentPaymentStream[0]?.answerId : undefined;
  const {
    address,
    authenticate,
    createPaymentPayload,
    ensureGatewayFunds,
    fundGateway,
    openWallet
  } = useMaecenasWallet();
  const [question, setQuestion] = useState("");
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const [strategy, setStrategy] = useState<ResearchStrategy>("balanced");
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [strategyFocusIndex, setStrategyFocusIndex] = useState(1);
  const strategyMenu = useRef<HTMLDivElement>(null);
  const strategyTrigger = useRef<HTMLButtonElement>(null);
  const strategyOptions = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedStrategyIndex = Math.max(0, researchStrategies.findIndex((option) => option.value === strategy));
  const [budgetOpen, setBudgetOpen] = useState(false);
  const budgetMenu = useRef<HTMLDivElement>(null);
  const budgetTrigger = useRef<HTMLButtonElement>(null);
  const [budgetUSDC, setBudgetUSDC] = useState("0.0050");
  const [fundingMode, setFundingMode] = useState<"grant" | "wallet">("grant");
  const [sessionId, setSessionId] = useState("");
  const [usage, setUsage] = useState<Usage>();
  const [pendingRequest, setPendingRequest] = useState<ResearchRequest>();
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [stage, setStage] = useState("");
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [error, setError] = useState("");
  const [gatewayFundAmount, setGatewayFundAmount] = useState("");

  useEffect(() => {
    if (strategyOpen) strategyOptions.current[strategyFocusIndex]?.focus();
  }, [strategyOpen, strategyFocusIndex]);

  useEffect(() => {
    if (!strategyOpen && !budgetOpen) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (strategyOpen && !strategyMenu.current?.contains(target)) setStrategyOpen(false);
      if (budgetOpen && !budgetMenu.current?.contains(target)) setBudgetOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [budgetOpen, strategyOpen]);

  function openStrategyMenu(index = selectedStrategyIndex) {
    setStrategyFocusIndex(index);
    setStrategyOpen(true);
  }

  function moveStrategyFocus(index: number) {
    const nextIndex = (index + researchStrategies.length) % researchStrategies.length;
    setStrategyFocusIndex(nextIndex);
    strategyOptions.current[nextIndex]?.focus();
  }

  useEffect(() => {
    const id = getSessionId();
    setSessionId(id);
    getUsage(id)
      .then((nextUsage) => {
        setUsage(nextUsage);
        setPaymentRequired(nextUsage.requiresPayment);
        if (nextUsage.requiresPayment) setFundingMode("wallet");
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
      prepareAnswerOnboardingTour();
      router.push(`/answer/${answerId}`);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 402) {
        const nextUsage = await getUsage(sessionId);
        setUsage(nextUsage);
        setFundingMode("wallet");
        setPaymentRequired(true);
      } else if (cause instanceof ApiError && cause.status === 409 && cause.data.error === "FREE_QUOTA_BUSY") {
        setFundingMode("wallet");
        setPaymentRequired(true);
        setError(`${cause.message}. Pay ${usage?.paidSearchPriceUSDC ?? "0.05"} USDC to start another run now.`);
      } else {
        setError(cause instanceof Error ? cause.message : "Research commission failed");
      }
    } finally {
      setStage("");
    }
  }

  async function submitResearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stage || !sessionId || !question.trim()) return;
    const request = {
      clientRequestId: `req_${window.crypto.randomUUID().replaceAll("-", "")}`,
      question: question.trim(),
      strategy,
      budgetUSDC
    };
    setPendingRequest(request);
    if (fundingMode === "wallet" || usage?.requiresPayment || paymentRequired) {
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
      if (!address) {
        openWallet();
        return;
      }
      setStage("Authenticating Dynamic wallet...");
      const wallet = await authenticate();
      setStage("Opening treasury request...");
      const intent = await createSearchPaymentIntent(sessionId, wallet, fundingMode === "wallet");
      if (intent.paymentMode === "real") {
        setStage("Checking Circle Gateway funds...");
        setGatewayFundAmount(intent.amountUSDC);
        await ensureGatewayFunds(intent.amountUSDC);
      }
      const paymentPayload =
        intent.paymentMode === "real"
          ? await (async () => {
              setStage("Signing x402 EIP-712 authorization...");
              return createPaymentPayload(intent.paymentRequired!);
            })()
          : undefined;
      setStage(intent.paymentMode === "real" ? "Submitting x402 payment to Circle Gateway..." : "Recording test settlement...");
      const payment = await submitSearchPaymentProof({
        paymentIntentId: intent.paymentIntentId,
        sessionId,
        walletAddress: wallet,
        paymentProof: paymentPayload ? "" : `mock_x402_${window.crypto.randomUUID()}`,
        paymentPayload,
        txHash: paymentPayload ? undefined : `mock_tx_${window.crypto.randomUUID()}`
      });
      setPaymentRequired(false);
      setGatewayFundAmount("");
      await executeResearch(request, { walletAddress: wallet, searchPaymentId: payment.searchPaymentId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Treasury settlement failed");
      setStage("");
    }
  }

  const busy = Boolean(stage);
  const canFundGateway = error.startsWith("Circle Gateway balance is too low.") && gatewayFundAmount;
  const maximumBudgetUSDC = fundingMode === "wallet"
    ? usage?.paidEvidenceBudgetUSDC ?? "0.035"
    : usage?.freeEvidenceBudgetUSDC ?? "0.01";

  async function fundGatewayBalance() {
    if (!gatewayFundAmount) return;
    setError("");
    setStage("Funding Circle Gateway...");
    try {
      await fundGateway(gatewayFundAmount);
      setStage("");
      await confirmPayment();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gateway funding failed");
      setStage("");
    }
  }

  return (
    <div>
    <form onSubmit={submitResearch} className="research-composer" aria-label="Research question">
      <label className="sr-only" htmlFor="question">Research question</label>
      <textarea
        ref={questionInput}
        id="question"
        data-tour="research-mandate"
        required
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        onFocus={() => {
          setBudgetOpen(false);
          setStrategyOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        rows={3}
        placeholder="Ask anything. Follow the evidence."
        className="block min-h-24 w-full resize-y border-0 bg-transparent p-0 text-base leading-7 text-cream outline-none placeholder:text-muted"
      />

      <div className="composer-toolbar">
        <div className="composer-controls">
          <div data-tour="research-funding" className="composer-funding">
            <button
              type="button"
              disabled={!usage?.freeSearchesRemaining}
              onClick={() => {
                setFundingMode("grant");
                setBudgetUSDC((current) => Math.min(Number(current), Number(usage?.freeEvidenceBudgetUSDC ?? "0.01")).toFixed(4));
                setPaymentRequired(false);
              }}
              aria-pressed={fundingMode === "grant"}
              className={`composer-choice ${fundingMode === "grant" ? "composer-choice-active" : ""}`}
            >
              Patron grant
            </button>
            <button
              type="button"
              onClick={() => {
                setFundingMode("wallet");
                setPaymentRequired(false);
              }}
              aria-pressed={fundingMode === "wallet"}
              className={`composer-choice ${fundingMode === "wallet" ? "composer-choice-active" : ""}`}
            >
              Pay {usage?.paidSearchPriceUSDC ?? "0.05"} USDC
            </button>
          </div>
          <div ref={strategyMenu} data-tour="research-posture" className="relative">
            <button
              ref={strategyTrigger}
              type="button"
              aria-label={`Research posture: ${researchStrategies[selectedStrategyIndex].label}`}
              aria-haspopup="listbox"
              aria-expanded={strategyOpen}
              aria-controls="research-strategy-options"
              onClick={() => strategyOpen ? setStrategyOpen(false) : openStrategyMenu()}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  openStrategyMenu(event.key === "ArrowUp" ? researchStrategies.length - 1 : selectedStrategyIndex);
                }
              }}
              className={`composer-control composer-strategy-trigger ${strategyOpen ? "composer-control-active" : ""}`}
            >
              <SlidersHorizontal size={14} aria-hidden="true" />
              <span>{researchStrategies[selectedStrategyIndex].label}</span>
              <motion.span animate={{ rotate: strategyOpen ? 180 : 0 }} transition={{ duration: 0.16 }} className="inline-flex">
                <ChevronDown size={12} aria-hidden="true" />
              </motion.span>
            </button>
            <AnimatePresence>
              {strategyOpen ? (
                <motion.div
                  id="research-strategy-options"
                  role="listbox"
                  aria-label="Research posture"
                  initial={{ opacity: 0, y: 7, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.985 }}
                  transition={{ duration: 0.16, ease: [0.2, 0.75, 0.25, 1] }}
                  className="strategy-menu"
                >
                  {researchStrategies.map((option, index) => (
                    <button
                      key={option.value}
                      ref={(element) => { strategyOptions.current[index] = element; }}
                      type="button"
                      role="option"
                      aria-selected={strategy === option.value}
                      tabIndex={strategyFocusIndex === index ? 0 : -1}
                      onFocus={() => setStrategyFocusIndex(index)}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          moveStrategyFocus(index + 1);
                        } else if (event.key === "ArrowUp") {
                          event.preventDefault();
                          moveStrategyFocus(index - 1);
                        } else if (event.key === "Home") {
                          event.preventDefault();
                          moveStrategyFocus(0);
                        } else if (event.key === "End") {
                          event.preventDefault();
                          moveStrategyFocus(researchStrategies.length - 1);
                        } else if (event.key === "Escape") {
                          event.preventDefault();
                          setStrategyOpen(false);
                          strategyTrigger.current?.focus();
                        } else if (event.key === "Tab") {
                          setStrategyOpen(false);
                        }
                      }}
                      onClick={() => {
                        setStrategy(option.value);
                        setStrategyOpen(false);
                        window.requestAnimationFrame(() => strategyTrigger.current?.focus());
                      }}
                      className={`composer-strategy-option ${strategy === option.value ? "composer-strategy-option-active" : ""}`}
                    >
                      <span>{option.label}</span>
                      {strategy === option.value ? <span aria-hidden="true" className="strategy-option-check">✓</span> : null}
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <div ref={budgetMenu} data-tour="research-budget" className="relative">
            <button
              ref={budgetTrigger}
              id="research-budget-toggle"
              type="button"
              aria-expanded={budgetOpen}
              aria-controls="research-budget-panel"
              onClick={() => setBudgetOpen((open) => !open)}
              className={`composer-control ${budgetOpen ? "composer-control-active" : ""}`}
            >
              <CircleDollarSign size={14} aria-hidden="true" />
              <span>Budget</span><ChevronDown size={12} aria-hidden="true" className={`transition-transform duration-150 ${budgetOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
            {budgetOpen ? (
            <motion.div
              id="research-budget-panel"
              role="group"
              aria-labelledby="research-budget-toggle"
              initial={{ opacity: 0, y: 7, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.99 }}
              transition={{ duration: 0.15, ease: [0.2, 0.75, 0.25, 1] }}
              className="composer-budget-panel absolute bottom-full right-0 z-30 mb-3 w-60 rounded-xl border border-marble/15 bg-panel-2 p-4"
            >
              <div className="flex justify-between text-xs text-muted">
                <span>Evidence budget</span>
                <span className="text-gold font-bold">{budgetUSDC} USDC</span>
              </div>
              <input
                type="range"
                aria-label="Evidence budget"
                min="0.0001"
                max={maximumBudgetUSDC}
                step="0.0001"
                value={budgetUSDC}
                onChange={(e) => setBudgetUSDC(Number(e.target.value).toFixed(4))}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setBudgetOpen(false);
                    budgetTrigger.current?.focus();
                  }
                }}
                className="composer-budget-range mt-3 w-full accent-gold h-1 bg-marble/10 rounded-lg appearance-none cursor-pointer"
              />
              <div className="mt-2 flex justify-between text-[10px] text-muted">
                <span>0.0001 min</span>
                <span>{maximumBudgetUSDC} max</span>
              </div>
            </motion.div>
            ) : null}
            </AnimatePresence>
          </div>
        </div>
        <motion.button
          data-tour="research-submit"
          type="submit"
          aria-label="Start research"
          title="Start research"
          disabled={busy || !sessionId || !question.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="composer-submit"
        >
          <ArrowUp size={20} />
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {stage && <AnimatedResearchLoader key="research-loader" stage={stage} events={events} />}

        {!stage && paymentRequired ? (
          <ResearchPaymentGate
            key="payment-box"
            evidenceBudgetUSDC={budgetUSDC}
            isWalletConnected={Boolean(address)}
            mode={usage?.paymentMode ?? "mock"}
            onConfirm={confirmPayment}
            priceUSDC={usage?.paidSearchPriceUSDC ?? "0.05"}
          />
        ) : null}
      </AnimatePresence>


      {error ? (
        <div role="alert" className="mt-4 border border-danger/40 bg-danger/10 p-3 text-sm text-red-200">
          <p>{error}</p>
          {canFundGateway ? (
            <button
              type="button"
              onClick={fundGatewayBalance}
              disabled={busy}
              className="mt-3 roman-button inline-flex items-center justify-center bg-gold px-4 py-2 font-mono text-[11px] font-semibold uppercase text-ink transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              Fund Gateway {gatewayFundAmount} USDC
            </button>
          ) : null}
        </div>
      ) : null}
    </form>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-dim">
      <span>{usage ? usage.freeSearchesRemaining > 0 ? `${usage.freeSearchesRemaining} patron-funded searches left` : `${usage.paidSearchPriceUSDC} USDC per search` : "Cited answers. Transparent funding."}</span>
      {featuredAnswerId ? <Link href={`/answer/${featuredAnswerId}`} className="inline-flex items-center gap-1 text-muted hover:text-gold">Explore a completed answer <ArrowUpRight size={12} /></Link> : null}
    </div>
    <section className="mt-8 sm:mt-10" aria-label="Suggested questions">
      <p className="mb-3 text-xs text-muted">A little inspiration</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {exampleQuestions.map(({ title, description, question: example, icon: Icon }) => (
          <button key={title} type="button" disabled={busy} className="question-suggestion"
            onClick={() => { setQuestion(example); setPendingRequest(undefined); setPaymentRequired(false); setError(""); questionInput.current?.focus(); }}>
            <Icon size={20} strokeWidth={1.5} className="mb-4 text-gold/75" />
            <span className="block text-[13px] text-cream">{title}</span>
            <span className="mt-1.5 block text-xs leading-5 text-muted">{description}</span>
          </button>
        ))}
      </div>
    </section>
    </div>
  );
}
