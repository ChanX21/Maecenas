const sessionKey = "maecenas_session_id";
const walletKey = "maecenas_wallet_address";

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

export async function connectWallet(): Promise<string> {
  const ethereum = (window as Window & {
    ethereum?: { request(input: { method: string }): Promise<unknown> };
  }).ethereum;
  if (!ethereum) throw new Error("Install or enable an EVM wallet to continue");
  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  const wallet = accounts[0]?.toLowerCase();
  if (!wallet) throw new Error("Wallet connection was not approved");
  window.localStorage.setItem(walletKey, wallet);
  window.dispatchEvent(new Event("maecenas:wallet-changed"));
  return wallet;
}

export function notifyUsageChanged(): void {
  window.dispatchEvent(new Event("maecenas:usage-changed"));
}
