import type { CitationPayment, Source } from "@/types";
import { makeId } from "@/utils/ids";
import { createEvidenceGrant, signReceipt, verifyToken } from "@/security";
import { CirclePaymentError, payCircleResource } from "@/payments/circle-gateway";
import { getArcNetwork } from "@/payments/arc-environment";
import {
  completeEvidencePaymentAttempt,
  failEvidencePaymentAttempt,
  recordEvidencePaymentAuthorization,
  reserveEvidencePaymentAttempt
} from "@/db/store";

const agentName = "Maecenas Scholar v1";
const mockWallet = "0x00000000000000000000000000000000000a11ce";

export function getPaymentMode(): "real" | "mock" {
  return process.env.PAYMENT_MODE === "real" ? "real" : "mock";
}

export function buildPaymentRequired(source: Source) {
  return {
    status: 402,
    error: "Payment Required",
    x402: {
      network: getArcNetwork(),
      asset: "USDC",
      amountUSDC: source.citationPriceUSDC,
      recipientWallet: source.walletAddress,
      resource: `/api/sources/${source.id}/evidence`
    }
  };
}

export function hasValidPaymentProof(source: Source, proof?: string | null): boolean {
  const grant = proof ? verifyToken<{ typ: "evidence"; exp: number; sourceId: string; receiptId: string; answerId: string }>(proof, "evidence") : undefined;
  return grant?.sourceId === source.id;
}

export function requestProtectedEvidence(source: Source, proof?: string | null) {
  if (!hasValidPaymentProof(source, proof)) {
    return {
      ok: false as const,
      challenge: buildPaymentRequired(source)
    };
  }

  return {
    ok: true as const,
    evidence: {
      sourceId: source.id,
      title: source.title,
      authorName: source.authorName,
      evidenceText: source.evidenceText,
      citationPriceUSDC: source.citationPriceUSDC
    }
  };
}

export async function createEvidencePayment(
  source: Source,
  answerId: string,
  userPrompt: string,
  fundedBy: CitationPayment["fundedBy"],
  searchPaymentId?: string,
  paymentScope?: string
): Promise<{
  receipt: CitationPayment;
  paymentProof?: string;
  evidence?: { sourceId: string; title: string; authorName: string; evidenceText: string; citationPriceUSDC: string };
}> {
  const mode = getPaymentMode();
  let paymentId: string | undefined = `mock_${makeId("x402").replace("x402_", "")}`;
  let txHash: string | undefined;
  let network = getArcNetwork();
  let payerWallet = process.env.MAECENAS_AGENT_WALLET_ADDRESS ?? mockWallet;
  let evidence;
  if (mode === "real") {
    if (!paymentScope) throw new Error("paymentScope is required for real evidence payouts");
    const attempt = await reserveEvidencePaymentAttempt({
      paymentScope,
      sourceId: source.id,
      amountUSDC: source.citationPriceUSDC,
      recipientWallet: source.walletAddress
    });
    if (attempt.status === "paid") {
      if (!attempt.evidence || !attempt.payerWallet || !attempt.network) {
        throw new Error("Completed evidence payment is missing its durable result");
      }
      paymentId = attempt.paymentId;
      txHash = attempt.txHash;
      network = attempt.network;
      payerWallet = attempt.payerWallet;
      evidence = { ...attempt.evidence, sourceId: source.id, citationPriceUSDC: source.citationPriceUSDC };
    } else {
      const baseUrl = process.env.PUBLIC_BACKEND_URL ?? `http://127.0.0.1:${process.env.BACKEND_PORT ?? 4000}`;
      try {
        const payment = await payCircleResource<{
          id: string;
          title: string;
          authorName: string;
          evidenceText: string;
        }>(
          `${baseUrl}/api/sources/${source.id}/evidence`,
          (proof) => recordEvidencePaymentAuthorization(attempt.id, proof)
        );
        const completed = await completeEvidencePaymentAttempt({
          id: attempt.id,
          paymentId: payment.paymentId,
          txHash: payment.txHash,
          payerWallet: payment.payer,
          network: payment.network,
          evidence: payment.data
        });
        paymentId = completed.paymentId;
        txHash = completed.txHash;
        network = completed.network!;
        payerWallet = completed.payerWallet!;
        evidence = { ...payment.data, sourceId: source.id, citationPriceUSDC: source.citationPriceUSDC };
      } catch (error) {
        if (error instanceof CirclePaymentError && !error.mayHaveMoved) {
          await failEvidencePaymentAttempt(attempt.id);
        }
        throw error;
      }
    }
  }
  const unsigned: Omit<CitationPayment, "receiptSignature"> = {
    id: makeId("rcpt"),
    answerId,
    searchPaymentId,
    sourceId: source.id,
    sourceTitle: source.title,
    userPrompt,
    amountUSDC: source.citationPriceUSDC,
    paymentId,
    txHash,
    payerAgent: agentName,
    payerWallet,
    recipientWallet: source.walletAddress,
    status: mode === "mock" ? "mock" : "paid",
    fundedBy,
    network,
    createdAt: new Date().toISOString()
  };
  const receipt: CitationPayment = { ...unsigned, receiptSignature: signReceipt(unsigned) };

  return {
    receipt,
    paymentProof: mode === "mock" ? createEvidenceGrant(source.id, receipt.id, answerId) : undefined,
    evidence
  };
}
