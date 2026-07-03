import { BatchEvmScheme } from "@circle-fin/x402-batching/client";

const sessionKey = "maecenas_session_id";
const walletKey = "maecenas_wallet_address";
const authTokenKey = "maecenas_auth_token";

type EthereumProvider = {
  request(input: { method: string; params?: unknown[] }): Promise<unknown>;
};

function provider(): EthereumProvider {
  const ethereum = (window as Window & { ethereum?: EthereumProvider }).ethereum;
  if (!ethereum) throw new Error("Install or enable an EVM wallet to continue");
  return ethereum;
}

export function getSessionId(): string {
  const existing = window.localStorage.getItem(sessionKey);
  if (existing) return existing;
  const sessionId = `sess_${window.crypto.randomUUID().replaceAll("-", "")}`;
  window.localStorage.setItem(sessionKey, sessionId);
  return sessionId;
}

export function getSavedWallet(): string {
  return window.localStorage.getItem(walletKey) ?? "";
}

export function getAuthToken(): string {
  return window.localStorage.getItem(authTokenKey) ?? "";
}

export async function connectWallet(): Promise<string> {
  const ethereum = provider();
  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  const wallet = accounts[0]?.toLowerCase();
  if (!wallet) throw new Error("Wallet connection was not approved");
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const challengeResponse = await fetch(`${apiBase}/api/auth/nonce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress: wallet })
  });
  if (!challengeResponse.ok) throw new Error("Could not create wallet authentication challenge");
  const challenge = await challengeResponse.json() as { id: string; message: string };
  const signature = await ethereum.request({
    method: "personal_sign",
    params: [challenge.message, wallet]
  });
  const verificationResponse = await fetch(`${apiBase}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress: wallet, nonceId: challenge.id, signature })
  });
  if (!verificationResponse.ok) throw new Error("Wallet authentication failed");
  const verification = await verificationResponse.json() as { token: string };
  window.localStorage.setItem(walletKey, wallet);
  window.localStorage.setItem(authTokenKey, verification.token);
  window.dispatchEvent(new Event("maecenas:wallet-changed"));
  return wallet;
}

export async function createCirclePaymentPayload(paymentRequired: {
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
}) {
  const wallet = getSavedWallet() as `0x${string}`;
  if (!wallet) throw new Error("Connect wallet before funding research");
  const ethereum = provider();
  const scheme = new BatchEvmScheme({
    address: wallet,
    signTypedData: async (params) => ethereum.request({
      method: "eth_signTypedData_v4",
      params: [wallet, JSON.stringify(params, (_, value) => typeof value === "bigint" ? value.toString() : value)]
    }) as Promise<`0x${string}`>
  });
  const accepted = paymentRequired.accepts[0];
  if (!accepted) throw new Error("Circle Gateway returned no supported payment option");
  const payload = await scheme.createPaymentPayload(paymentRequired.x402Version, accepted);
  return {
    ...payload,
    accepted,
    resource: paymentRequired.resource,
    extensions: {}
  };
}

export async function signSourceOwnership(sourceUrl: string): Promise<string> {
  const wallet = getSavedWallet();
  if (!wallet || !getAuthToken()) throw new Error("Connect and authenticate the contributor wallet first");
  const normalizedUrl = new URL(sourceUrl).toString();
  const message = [
    "Maecenas source ownership attestation",
    `Wallet: ${wallet.toLowerCase()}`,
    `Source: ${normalizedUrl}`,
    "I attest that I control or am authorized to register this research source."
  ].join("\n");
  return provider().request({ method: "personal_sign", params: [message, wallet] }) as Promise<string>;
}

export function notifyUsageChanged(): void {
  window.dispatchEvent(new Event("maecenas:usage-changed"));
}
