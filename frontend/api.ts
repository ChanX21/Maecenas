import type {
  Answer,
  CitationPayment,
  ResearchStrategy,
  GatewayBurnIntent,
  GatewayWithdrawalQuote,
  SearchPaymentIntentResponse,
  SearchPaymentResponse,
  Source,
  TraceEvent,
  Usage
} from "@/types";
import { getAuthToken } from "@/lib/browser-session";

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: Record<string, unknown>
  ) {
    super(String(data.message ?? data.error ?? `Request failed: ${status}`));
  }
}

export type LeaderboardResponse = {
  paymentMode: "mock" | "real";
  metrics: {
    sourcesRegistered: number;
    sourceOwners: number;
    contributorsRewarded: number;
    researchQuestionsAnswered: number;
    fundedCommissions: number;
    paidEvidenceUnlocks: number;
    totalUSDCDistributed: string;
    totalTestUSDCDistributed: string;
    questionsAnswered: number;
    freeSearchesUsed: number;
    paidSearchesCompleted: number;
    paidSearchRevenueUSDC: string;
    sourcePayoutsUSDC: string;
    paidCitations: number;
  };
  topEarningSources: {
    sourceId: string;
    title: string;
    authorName: string;
    citations: number;
    earnedUSDC: string;
  }[];
  recentPaymentStream: CitationPayment[];
};

export type DashboardResponse = {
  paymentMode: "mock" | "real";
  wallet: string;
  totalSourcesRegistered: number;
  totalCitationsReceived: number;
  totalUSDCEarned: string;
  latestPaidCitations: CitationPayment[];
  topEarningSource: {
    source: Source;
    earnedUSDC: string;
  } | null;
};

export type AdminSource = Source & {
  evidencePreview: string;
  ownershipAttestation?: string;
};

export function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  if (configured.startsWith("/") && typeof window === "undefined") {
    return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${configured}`;
  }
  return configured;
}

export function apiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...init?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    cache: "no-store"
  });
  const text = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { message: text || `Request failed: ${response.status}` };
  }
  if (!response.ok) {
    throw new ApiError(response.status, data);
  }
  return data as T;
}

export async function getSources() {
  return apiFetch<{ sources: Source[] }>("/api/sources");
}

export async function getOwnerSources(wallet: string) {
  return apiFetch<{ sources: Source[] }>(`/api/sources?wallet=${encodeURIComponent(wallet)}`);
}

export async function registerSource(input: {
  title: string;
  authorName: string;
  sourceUrl: string;
  doiOrCanonicalUrl?: string;
  walletAddress: string;
  citationPriceUSDC: string;
  abstract: string;
  evidenceText: string;
  ownershipAttestation: string;
  tags: string;
  license?: string;
}) {
  return apiFetch<{ source: Source }>("/api/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export async function getAnswer(id: string) {
  return apiFetch<{
    answer: Answer;
    commissionPayment?: {
      amountUSDC: string;
      status: "pending" | "paid" | "failed" | "mock";
      paymentMode: "mock" | "real";
      protocol: "x402";
      network: string;
      recipientWallet?: string;
      paymentId?: string;
      txHash?: string;
      paidAt?: string;
    };
  }>(`/api/answers/${id}`);
}

export async function getReceipt(id: string) {
  return apiFetch<{ receipt: CitationPayment }>(`/api/receipts/${id}`);
}

export async function verifyReceipt(id: string) {
  return apiFetch<{ receiptId: string; valid: boolean; status: string; network?: string; transaction?: string }>(
    `/api/receipts/${id}/verify`
  );
}

export async function getLeaderboard() {
  return apiFetch<LeaderboardResponse>("/api/leaderboard");
}

export async function getDashboard(wallet: string) {
  const query = wallet ? `?wallet=${encodeURIComponent(wallet)}` : "";
  return apiFetch<DashboardResponse>(`/api/dashboard${query}`);
}

export async function getGatewayWithdrawalQuote(walletAddress: string) {
  return apiFetch<GatewayWithdrawalQuote>(
    `/api/gateway/withdrawal-quote?wallet=${encodeURIComponent(walletAddress)}`
  );
}

export async function withdrawGatewayBalance(input: {
  walletAddress: string;
  burnIntent: GatewayBurnIntent;
  signature: string;
}) {
  return apiFetch<{
    txHash: `0x${string}`;
    transferId?: string;
    amountUSDC: string;
    feeUSDC: string;
  }>("/api/gateway/withdraw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export async function getAdminSources(status = "pending") {
  return apiFetch<{ sources: AdminSource[] }>(`/api/admin/sources?status=${encodeURIComponent(status)}`);
}

export async function reviewAdminSource(id: string, status: "approved" | "rejected", reason?: string) {
  return apiFetch<{ source: Source }>(`/api/admin/sources/${id}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reason })
  });
}

export async function getUsage(sessionId: string, walletAddress?: string) {
  const query = new URLSearchParams({ sessionId });
  if (walletAddress) query.set("wallet", walletAddress);
  return apiFetch<Usage>(`/api/usage?${query}`);
}

export async function createSearchPaymentIntent(sessionId: string, walletAddress: string, usePaidSearch = false) {
  return apiFetch<SearchPaymentIntentResponse>("/api/payments/search-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, walletAddress, usePaidSearch })
  });
}

export async function submitSearchPaymentProof(input: {
  paymentIntentId: string;
  sessionId: string;
  walletAddress: string;
  paymentProof: string;
  paymentPayload?: unknown;
  txHash?: string;
}) {
  return apiFetch<SearchPaymentResponse>("/api/payments/search-proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export async function runResearch(input: {
  sessionId: string;
  clientRequestId: string;
  question: string;
  budgetUSDC?: string;
  strategy: ResearchStrategy;
  walletAddress?: string;
  searchPaymentId?: string;
}) {
  return apiFetch<{
    answerId?: string;
    runId?: string;
    status: "completed" | "processing";
    paymentType: "free_sponsored" | "user_paid";
    searchPaymentId?: string;
    freeSearchesRemaining: number;
  }>("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export async function getResearchRun(runId: string, sessionId: string) {
  return apiFetch<{
    answerId?: string;
    runId?: string;
    status: "completed" | "processing" | "failed";
    events?: TraceEvent[];
  }>(`/api/research/runs/${encodeURIComponent(runId)}?sessionId=${encodeURIComponent(sessionId)}`);
}
