import type { CitationPayment, Source, UnlockedEvidence } from "@/lib/types";
import { makeId } from "@/lib/utils/ids";

const agentName = "Mecenas Scholar v1";
const mockWallet = "0xMecenasAgent000000000000000000000000000001";

export function getPaymentMode(): "real" | "mock" {
  return process.env.NEXT_PUBLIC_PAYMENT_MODE === "real" && Boolean(process.env.CIRCLE_API_KEY) ? "real" : "mock";
}

export function buildPaymentRequired(source: Source) {
  return {
    status: 402,
    error: "Payment Required",
    x402: {
      network: process.env.X402_NETWORK ?? "arc-testnet",
      asset: "USDC",
      amountUSDC: source.citationPriceUSDC,
      recipientWallet: source.walletAddress,
      resource: `/api/sources/${source.id}/evidence`
    }
  };
}

export function hasValidPaymentProof(source: Source, proof?: string | null): boolean {
  return proof === `proof:${source.id}`;
}

export async function unlockEvidenceWithPayment(
  source: Source,
  answerId: string,
  userPrompt: string
): Promise<UnlockedEvidence> {
  const mode = getPaymentMode();
  const paymentId = `${mode === "mock" ? "mock" : "pay"}_${makeId("x402").replace("x402_", "")}`;
  const receipt: CitationPayment = {
    id: makeId("rcpt"),
    answerId,
    sourceId: source.id,
    sourceTitle: source.title,
    userPrompt,
    amountUSDC: source.citationPriceUSDC,
    paymentId,
    txHash: mode === "real" ? undefined : `mock_tx_${source.id}`,
    payerAgent: agentName,
    payerWallet: process.env.MECENAS_AGENT_WALLET_ADDRESS ?? mockWallet,
    recipientWallet: source.walletAddress,
    status: mode === "real" ? "pending" : "mock",
    createdAt: new Date().toISOString()
  };

  return {
    sourceId: source.id,
    title: source.title,
    authorName: source.authorName,
    evidenceText: source.evidenceText,
    citationPriceUSDC: source.citationPriceUSDC,
    receipt
  };
}
