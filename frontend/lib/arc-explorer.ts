import type { CitationPayment } from "@/types";

const ARC_EXPLORER_BASE =
  process.env.NEXT_PUBLIC_ARC_EXPLORER_URL?.replace(/\/$/, "") ?? "https://testnet.arcscan.app";

const TX_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const GATEWAY_PAYMENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getCitationSettlementHash(
  receipt: Pick<CitationPayment, "txHash" | "paymentId" | "status">
): string | undefined {
  if (receipt.status === "mock") return undefined;

  for (const candidate of [receipt.txHash, receipt.paymentId]) {
    if (!candidate || candidate.startsWith("mock_")) continue;
    const normalized = candidate.startsWith("0x") ? candidate : `0x${candidate}`;
    if (TX_HASH_PATTERN.test(normalized)) return normalized;
  }

  return undefined;
}

export function citationPaymentStatusLabel(
  receipt: Pick<CitationPayment, "txHash" | "paymentId" | "status">
): string {
  if (receipt.status === "mock") return "Test record / not settled";
  if (receipt.status === "failed") return "Payment failed";
  if (receipt.status === "pending") return "Payment pending";
  return getCitationSettlementHash(receipt) ? "On-chain settled" : "Gateway credited";
}

export function arcExplorerTxUrl(txHash: string): string {
  return `${ARC_EXPLORER_BASE}/tx/${txHash}`;
}

export function circleGatewayPaymentUrl(paymentId: string): string | undefined {
  return GATEWAY_PAYMENT_ID_PATTERN.test(paymentId)
    ? `https://gateway-api-testnet.circle.com/v1/x402/transfers/${encodeURIComponent(paymentId)}`
    : undefined;
}

export function arcExplorerAddressUrl(address: string): string {
  return `${ARC_EXPLORER_BASE}/address/${address}`;
}

export function shortenTxHash(txHash: string): string {
  return `${txHash.slice(0, 10)}…${txHash.slice(-8)}`;
}
