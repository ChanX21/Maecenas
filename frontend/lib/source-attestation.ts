type MessageSigner = (message: string) => Promise<string>;

export async function signSourceListing(
  sourceUrl: string,
  walletAddress: string,
  signMessage: MessageSigner
): Promise<string> {
  const normalizedUrl = new URL(sourceUrl).toString();
  const message = [
    "Maecenas evidence listing attestation",
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Source: ${normalizedUrl}`,
    "I attest that I control or am authorized to list and distribute this research evidence under the stated terms."
  ].join("\n");

  return signMessage(message);
}
