import { createHmac, timingSafeEqual } from "crypto";
import { recoverMessageAddress } from "viem";
import type { CitationPayment } from "@/types";

type TokenPayload = Record<string, unknown> & {
  exp: number;
  typ: "auth" | "evidence";
};

function secret(): string {
  const value = process.env.TOKEN_SIGNING_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("TOKEN_SIGNING_SECRET is required in production");
  return "maecenas-local-development-only";
}

function encode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function signature(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function signToken(payload: TokenPayload): string {
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${signature(encoded)}`;
}

export function verifyToken<T extends TokenPayload>(token: string, type: T["typ"]): T | undefined {
  const [encoded, supplied] = token.split(".");
  if (!encoded || !supplied) return undefined;
  const expected = signature(encoded);
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
    return payload.typ === type && payload.exp > Date.now() ? payload : undefined;
  } catch {
    return undefined;
  }
}

export function walletAuthMessage(walletAddress: string, nonce: string, expiresAt: string): string {
  const origin = process.env.APP_ORIGIN ?? process.env.CORS_ORIGIN ?? "http://localhost:3000";
  return [
    "Maecenas wallet authentication",
    `Wallet: ${walletAddress}`,
    `Origin: ${origin}`,
    `Nonce: ${nonce}`,
    `Expires: ${expiresAt}`,
    "Purpose: authenticate source ownership and treasury access"
  ].join("\n");
}

export function sourceOwnershipMessage(walletAddress: string, sourceUrl: string): string {
  return [
    "Maecenas source ownership attestation",
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Source: ${sourceUrl}`,
    "I attest that I control or am authorized to register this research source."
  ].join("\n");
}

export async function verifyWalletSignature(walletAddress: string, message: string, signatureValue: string): Promise<boolean> {
  try {
    const recovered = await recoverMessageAddress({ message, signature: signatureValue as `0x${string}` });
    return recovered.toLowerCase() === walletAddress.toLowerCase();
  } catch {
    return false;
  }
}

export function createAuthToken(walletAddress: string): string {
  return signToken({
    typ: "auth",
    walletAddress: walletAddress.toLowerCase(),
    exp: Date.now() + Number(process.env.AUTH_SESSION_HOURS ?? 24) * 3_600_000
  });
}

export function createEvidenceGrant(sourceId: string, receiptId: string, answerId: string): string {
  return signToken({
    typ: "evidence",
    sourceId,
    receiptId,
    answerId,
    exp: Date.now() + Number(process.env.EVIDENCE_GRANT_MINUTES ?? 10) * 60_000
  });
}

export function signReceipt(receipt: Omit<CitationPayment, "receiptSignature">): string {
  return signature(
    JSON.stringify([
      receipt.id,
      receipt.answerId,
      receipt.sourceId,
      receipt.amountUSDC,
      receipt.payerWallet,
      receipt.recipientWallet,
      receipt.paymentId,
      receipt.txHash,
      receipt.status,
      receipt.createdAt
    ])
  );
}

export function verifyReceiptSignature(receipt: CitationPayment): boolean {
  const expected = signReceipt(receipt);
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(receipt.receiptSignature);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}
