const sessionKey = "maecenas_session_id";
const walletKey = "maecenas_wallet_address";
const authTokenKey = "maecenas_auth_token";

function storage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

export function getSessionId(): string {
  const browserStorage = storage();
  if (!browserStorage) return "";

  const existing = browserStorage.getItem(sessionKey);
  if (existing) return existing;

  const sessionId = `sess_${window.crypto.randomUUID().replaceAll("-", "")}`;
  browserStorage.setItem(sessionKey, sessionId);
  return sessionId;
}

export function getSavedWallet(): string {
  return storage()?.getItem(walletKey) ?? "";
}

export function getAuthToken(): string {
  return storage()?.getItem(authTokenKey) ?? "";
}

export function syncWalletAddress(walletAddress: string): void {
  const browserStorage = storage();
  if (!browserStorage) return;

  const normalizedAddress = walletAddress.toLowerCase();
  const previousAddress = browserStorage.getItem(walletKey) ?? "";
  if (previousAddress && previousAddress !== normalizedAddress) {
    browserStorage.removeItem(authTokenKey);
  }
  browserStorage.setItem(walletKey, normalizedAddress);
  window.dispatchEvent(new Event("maecenas:wallet-changed"));
}

export function saveWalletAuthentication(walletAddress: string, token: string): void {
  const browserStorage = storage();
  if (!browserStorage) return;

  browserStorage.setItem(walletKey, walletAddress.toLowerCase());
  browserStorage.setItem(authTokenKey, token);
  window.dispatchEvent(new Event("maecenas:wallet-changed"));
}

export function clearWalletSession(): void {
  const browserStorage = storage();
  if (!browserStorage) return;

  browserStorage.removeItem(walletKey);
  browserStorage.removeItem(authTokenKey);
  window.dispatchEvent(new Event("maecenas:wallet-changed"));
}

export function notifyUsageChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("maecenas:usage-changed"));
  }
}
