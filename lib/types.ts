export type ResearchStrategy = "conservative" | "balanced" | "aggressive";

export type Source = {
  id: string;
  title: string;
  authorName: string;
  sourceUrl: string;
  doiOrCanonicalUrl?: string;
  walletAddress: string;
  citationPriceUSDC: string;
  abstract: string;
  evidenceText: string;
  tags: string[];
  license?: string;
  createdAt: string;
};

export type Answer = {
  id: string;
  prompt: string;
  response: string;
  budgetUSDC: string;
  spentUSDC: string;
  citedSourceIds: string[];
  decisionTraceJson: ResearchTrace;
  createdAt: string;
};

export type CitationPaymentStatus = "pending" | "paid" | "failed" | "mock";

export type CitationPayment = {
  id: string;
  answerId: string;
  sourceId: string;
  sourceTitle: string;
  userPrompt: string;
  amountUSDC: string;
  txHash?: string;
  paymentId?: string;
  payerAgent: string;
  payerWallet: string;
  recipientWallet: string;
  status: CitationPaymentStatus;
  createdAt: string;
};

export type ResearchPlan = {
  userQuestion: string;
  subquestions: string[];
  evidenceNeeds: string[];
  maxBudgetUSDC: string;
  strategy: ResearchStrategy;
};

export type CandidateSource = {
  sourceId: string;
  title: string;
  authorName: string;
  preview: string;
  tags: string[];
  priceUSDC: string;
  walletAddress: string;
};

export type ScoredSource = CandidateSource & {
  relevanceScore: number;
  evidenceFitScore: number;
  noveltyScore: number;
  priceEfficiencyScore: number;
  finalScore: number;
  reason: string;
};

export type BudgetDecision = {
  maxBudgetUSDC: string;
  selectedSources: {
    sourceId: string;
    title: string;
    priceUSDC: string;
    reason: string;
  }[];
  skippedSources: {
    sourceId: string;
    title: string;
    priceUSDC: string;
    reason: string;
  }[];
  estimatedSpendUSDC: string;
};

export type UnlockedEvidence = {
  sourceId: string;
  title: string;
  authorName: string;
  evidenceText: string;
  citationPriceUSDC: string;
  receipt: CitationPayment;
};

export type TraceEvent = {
  id: string;
  phase:
    | "plan"
    | "scout"
    | "score"
    | "budget"
    | "payment-required"
    | "payment-sent"
    | "evidence-unlocked"
    | "receipt-saved"
    | "synthesis";
  title: string;
  detail: string;
  status: "completed" | "skipped" | "mock";
  createdAt: string;
};

export type ResearchTrace = {
  plan: ResearchPlan;
  candidates: CandidateSource[];
  scoredSources: ScoredSource[];
  budgetDecision: BudgetDecision;
  receipts: CitationPayment[];
  events: TraceEvent[];
  paymentMode: "real" | "mock";
};

export type MecenasDatabase = {
  sources: Source[];
  answers: Answer[];
  receipts: CitationPayment[];
};
