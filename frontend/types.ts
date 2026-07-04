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
  ownerWallet: string;
  tags: string[];
  license?: string;
  status: "pending" | "approved" | "rejected";
  ownershipVerifiedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
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
  receiptSignature: string;
  network?: string;
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
  paymentMode: "mock" | "real";
};

export type SearchPaymentIntentResponse = {
  paymentIntentId: string;
  amountUSDC: string;
  recipientWallet: string;
  network: string;
  status: "requires_payment" | "paid" | "expired" | "used";
  paymentMode: "mock" | "real";
  expiresAt: string;
  paymentRequired?: {
    x402Version: number;
    resource: Record<string, unknown>;
    accepts: Array<{
      scheme: string;
      network: string;
      asset: string;
      amount: string;
      payTo: string;
      maxTimeoutSeconds: number;
      extra?: Record<string, unknown>;
    }>;
  };
};

export type SearchPaymentResponse = {
  searchPaymentId: string;
  paymentIntentId: string;
  status: "pending" | "paid" | "failed" | "mock";
  amountUSDC: string;
  paymentMode: "mock" | "real";
};

export type GatewayTransferSpec = {
  version: number;
  sourceDomain: number;
  destinationDomain: number;
  sourceContract: `0x${string}`;
  destinationContract: `0x${string}`;
  sourceToken: `0x${string}`;
  destinationToken: `0x${string}`;
  sourceDepositor: `0x${string}`;
  destinationRecipient: `0x${string}`;
  sourceSigner: `0x${string}`;
  destinationCaller: `0x${string}`;
  value: string;
  salt: `0x${string}`;
  hookData: `0x${string}`;
};

export type GatewayBurnIntent = {
  maxBlockHeight: string;
  maxFee: string;
  spec: GatewayTransferSpec;
};

export type GatewayWithdrawalQuote = {
  canWithdraw: boolean;
  balanceUSDC: string;
  feeUSDC: string;
  amountUSDC: string;
  minimumBalanceUSDC?: string;
  burnIntent?: GatewayBurnIntent;
};
