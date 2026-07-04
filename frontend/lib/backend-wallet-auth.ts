import { getApiBaseUrl } from "@/api";
import {
  getAuthToken,
  getSavedWallet,
  saveWalletAuthentication
} from "@/lib/browser-session";

type MessageSigner = (message: string) => Promise<string>;

export async function authenticateBackendWallet(
  walletAddress: string,
  signMessage: MessageSigner
): Promise<string> {
  const normalizedAddress = walletAddress.toLowerCase();
  if (getAuthToken() && getSavedWallet() === normalizedAddress) {
    return normalizedAddress;
  }

  const challengeResponse = await fetch(`${getApiBaseUrl()}/api/auth/nonce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress: normalizedAddress })
  });
  if (!challengeResponse.ok) {
    throw new Error("Could not create wallet authentication challenge");
  }

  const challenge = await challengeResponse.json() as { id: string; message: string };
  const signature = await signMessage(challenge.message);
  const verificationResponse = await fetch(`${getApiBaseUrl()}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress: normalizedAddress,
      nonceId: challenge.id,
      signature
    })
  });
  if (!verificationResponse.ok) {
    throw new Error("Wallet authentication failed");
  }

  const verification = await verificationResponse.json() as { token: string };
  saveWalletAuthentication(normalizedAddress, verification.token);
  return normalizedAddress;
}
