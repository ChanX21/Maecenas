import { BatchEvmScheme } from "@circle-fin/x402-batching/client";
import type { Address, Hex } from "viem";
import type { SearchPaymentIntentResponse } from "@/types";

type PaymentRequired = NonNullable<SearchPaymentIntentResponse["paymentRequired"]>;

export type X402TypedData = {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: Address;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
};

export type X402TypedDataSigner = (typedData: X402TypedData) => Promise<Hex>;

export async function createCirclePaymentPayload(
  paymentRequired: PaymentRequired,
  walletAddress: Address,
  signTypedData: X402TypedDataSigner
) {
  const scheme = new BatchEvmScheme({
    address: walletAddress,
    signTypedData
  });
  const accepted = paymentRequired.accepts[0];
  if (!accepted) {
    throw new Error("Circle Gateway returned no supported payment option");
  }

  const payload = await scheme.createPaymentPayload(paymentRequired.x402Version, accepted);
  return {
    ...payload,
    accepted,
    resource: paymentRequired.resource,
    extensions: {}
  };
}
