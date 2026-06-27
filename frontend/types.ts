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

export type CitationPaymentStatus = "pending" | "paid" | "failed" | "mock";

export type CitationPayment = {
  id: string;
  answerId: string;
  searchPaymentId?: string;
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
  fundedBy: "maecenas_sponsored" | "user_paid_search";
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

export type Answer = {
  id: string;
  prompt: string;
  response: string;
  contentJson?: AnswerContent;
  budgetUSDC: string;
  spentUSDC: string;
  citedSourceIds: string[];
  decisionTraceJson: ResearchTrace;
  searchPaymentId?: string;
  paymentType: "free_sponsored" | "user_paid";
  sessionId?: string;
  walletAddress?: string;
  createdAt: string;
};

export type AnswerContent = {
  summary: string;
  sections: {
    heading: string;
    body: string;
    citations: string[];
  }[];
  limitations: string[];
};

export type Usage = {
  sessionId: string;
  walletAddress?: string;
  freeSearchesUsed: number;
  freeSearchLimit: number;
  freeSearchesRemaining: number;
  paidSearchesUsed: number;
  requiresPayment: boolean;
  paidSearchPriceUSDC: string;
};

export type SearchPaymentIntentResponse = {
  paymentIntentId: string;
  amountUSDC: string;
  recipientWallet: string;
  network: string;
  status: "requires_payment" | "paid" | "expired" | "used";
  paymentMode: "mock" | "real";
  expiresAt: string;
};

export type SearchPaymentResponse = {
  searchPaymentId: string;
  paymentIntentId: string;
  status: "pending" | "paid" | "failed" | "mock";
  amountUSDC: string;
  paymentMode: "mock" | "real";
};
