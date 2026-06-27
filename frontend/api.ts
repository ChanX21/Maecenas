import type {
  Answer,
  CitationPayment,
  SearchPaymentIntentResponse,
  SearchPaymentResponse,
  Source,
  Usage
} from "@/types";

export type LeaderboardResponse = {
  metrics: {
    sourcesRegistered: number;
    sourceOwners: number;
    researchQuestionsAnswered: number;
    paidEvidenceUnlocks: number;
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

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
}

export function apiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message ?? data.error ?? `Request failed: ${response.status}`);
  }
  return data as T;
}

export async function getSources() {
  return apiFetch<{ sources: Source[] }>("/api/sources");
}

export async function getAnswer(id: string) {
  return apiFetch<{ answer: Answer }>(`/api/answers/${id}`);
}

export async function getReceipt(id: string) {
  return apiFetch<{ receipt: CitationPayment }>(`/api/receipts/${id}`);
}

export async function getLeaderboard() {
  return apiFetch<LeaderboardResponse>("/api/leaderboard");
}

export async function getDashboard(wallet: string) {
  const query = wallet ? `?wallet=${encodeURIComponent(wallet)}` : "";
  return apiFetch<DashboardResponse>(`/api/dashboard${query}`);
}

export async function getUsage(sessionId: string, walletAddress?: string) {
  const query = new URLSearchParams({ sessionId });
  if (walletAddress) query.set("wallet", walletAddress);
  return apiFetch<Usage>(`/api/usage?${query}`);
}

export async function createSearchPaymentIntent(sessionId: string, walletAddress: string) {
  return apiFetch<SearchPaymentIntentResponse>("/api/payments/search-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, walletAddress })
  });
}

export async function submitSearchPaymentProof(input: {
  paymentIntentId: string;
  sessionId: string;
  walletAddress: string;
  paymentProof: string;
  txHash?: string;
}) {
  return apiFetch<SearchPaymentResponse>("/api/payments/search-proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}
