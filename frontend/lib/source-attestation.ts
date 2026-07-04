type MessageSigner = (message: string) => Promise<string>;

export async function signSourceOwnership(
  sourceUrl: string,
  walletAddress: string,
  signMessage: MessageSigner
): Promise<string> {
  const normalizedUrl = new URL(sourceUrl).toString();
  const message = [
    "Maecenas source ownership attestation",
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Source: ${normalizedUrl}`,
    "I attest that I control or am authorized to register this research source."
  ].join("\n");

  return signMessage(message);
}
