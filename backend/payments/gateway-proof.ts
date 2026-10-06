import { parseUSDCMicros } from "@/utils/money";

const addressPattern = /^0x[0-9a-f]{40}$/i;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hashPattern = /^0x[0-9a-f]{64}$/i;
const statuses = ["received", "batched", "confirmed", "completed", "failed"] as const;

export type GatewayTransfer = {
  id: string;
  status: typeof statuses[number];
  token: string;
  sendingNetwork: string;
  recipientNetwork: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  txHash: string | null;
  updatedAt: string;
};

export type PaymentRecord = {
  paymentId?: string;
  network?: string;
  payerWallet?: string;
  recipientWallet?: string;
  amountUSDC: string;
  status: "pending" | "paid" | "failed" | "mock";
};

export function proofNetwork(network?: string) {
  if (network === "eip155:5042002") return {
    gateway: "https://gateway-api-testnet.circle.com",
    explorer: "https://testnet.arcscan.app"
  };
  if (network === "eip155:5042") return {
    gateway: "https://gateway-api.circle.com",
    explorer: "https://arcscan.app"
  };
}

// Old x402 v2 records may contain accepted requirements. Never guess from current env.
export function recoverCommissionContext(proof: string | null | undefined, payer: string, amount: string): {
  network?: string; recipientWallet?: string;
} {
  try {
    const payload = JSON.parse(proof ?? "");
    const accepted = payload.accepted;
    const authorization = payload.payload?.authorization;
    if (accepted?.scheme !== "exact" || !proofNetwork(accepted.network)
      || !addressPattern.test(accepted.payTo) || !addressPattern.test(authorization?.from)
      || typeof authorization?.to !== "string"
      || authorization.from.toLowerCase() !== payer.toLowerCase()
      || authorization.to.toLowerCase() !== accepted.payTo.toLowerCase()
      || accepted.amount !== String(parseUSDCMicros(amount))
      || authorization.value !== accepted.amount) return {};
    return { network: accepted.network, recipientWallet: accepted.payTo };
  } catch {
    return {};
  }
}

export type GatewayVerification = {
  verification: "matched" | "mismatch" | "incomplete" | "unavailable" | "mock";
  message: string;
  checkedAt: string;
  transfer?: GatewayTransfer;
  circleUrl?: string;
  batchExplorerUrl?: string;
};

function isTransfer(value: unknown): value is GatewayTransfer {
  if (!value || typeof value !== "object") return false;
  const t = value as GatewayTransfer;
  return typeof t.id === "string" && uuidPattern.test(t.id)
    && statuses.includes(t.status) && typeof t.token === "string"
    && typeof t.sendingNetwork === "string" && typeof t.recipientNetwork === "string"
    && addressPattern.test(t.fromAddress) && addressPattern.test(t.toAddress)
    && typeof t.amount === "string" && /^\d{1,78}$/.test(t.amount)
    && (t.txHash === null || (typeof t.txHash === "string" && hashPattern.test(t.txHash)))
    && typeof t.updatedAt === "string" && Number.isFinite(Date.parse(t.updatedAt));
}

export async function verifyGatewayPayment(record: PaymentRecord): Promise<GatewayVerification> {
  const checkedAt = new Date().toISOString();
  if (record.status === "mock") return { verification: "mock", message: "Simulated payment; no Circle settlement occurred.", checkedAt };
  const network = proofNetwork(record.network);
  const { paymentId, payerWallet, recipientWallet, amountUSDC } = record;
  const circleUrl = network && paymentId && uuidPattern.test(paymentId)
    ? `${network.gateway}/v1/x402/transfers/${encodeURIComponent(paymentId)}` : undefined;
  if (!network || !circleUrl || !paymentId || !payerWallet || !recipientWallet) {
    return { verification: "incomplete", message: "Saved payment details are insufficient to verify settlement.", checkedAt, circleUrl };
  }
  try {
    const response = await fetch(circleUrl, { signal: AbortSignal.timeout(5_000), headers: { "Cache-Control": "no-cache" } });
    if (!response.ok) throw new Error("Circle lookup unavailable");
    const transfer: unknown = await response.json();
    if (!isTransfer(transfer)) throw new Error("Invalid Circle response");
    const matched = transfer.id.toLowerCase() === paymentId.toLowerCase()
      && transfer.fromAddress.toLowerCase() === payerWallet.toLowerCase()
      && transfer.toAddress.toLowerCase() === recipientWallet.toLowerCase()
      && BigInt(transfer.amount) === BigInt(parseUSDCMicros(amountUSDC))
      && transfer.token === "USDC"
      && transfer.sendingNetwork === record.network
      && transfer.recipientNetwork === record.network;
    return {
      verification: matched ? "matched" : "mismatch",
      message: matched ? "Circle payment details match the saved record." : "Circle payment details do not match the saved record.",
      checkedAt,
      // Return only proof fields; never forward arbitrary provider fields or signed payloads.
      transfer: {
        id: transfer.id, status: transfer.status, token: transfer.token,
        sendingNetwork: transfer.sendingNetwork, recipientNetwork: transfer.recipientNetwork,
        fromAddress: transfer.fromAddress, toAddress: transfer.toAddress,
        amount: transfer.amount, txHash: transfer.txHash, updatedAt: transfer.updatedAt
      },
      circleUrl,
      batchExplorerUrl: matched && transfer.txHash ? `${network.explorer}/tx/${transfer.txHash}` : undefined
    };
  } catch {
    return { verification: "unavailable", message: "Verification unavailable. Retry or inspect the Circle record directly.", checkedAt, circleUrl };
  }
}
