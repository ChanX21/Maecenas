import { BatchEvmScheme, CHAIN_CONFIGS } from "@circle-fin/x402-batching/client";
import {
  formatUnits,
  parseUnits,
  type Address,
  type Hex
} from "viem";
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

const arc = CHAIN_CONFIGS.arcTestnet;
export const arcRpcUrl =
  process.env.NEXT_PUBLIC_ARC_RPC_URL ??
  arc.rpcUrl ??
  arc.chain.rpcUrls.default.http[0] ??
  "https://rpc.testnet.arc.network";

async function gatewayBalance(address: Address): Promise<bigint> {
  const response = await fetch("https://gateway-api-testnet.circle.com/v1/balances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: "USDC",
      sources: [{ depositor: address, domain: arc.domain }]
    })
  });
  const data = await response.json() as { balances?: Array<{ balance?: string }>; message?: string };
  if (!response.ok) throw new Error(data.message ?? "Could not read Circle Gateway balance");
  return parseUnits(data.balances?.[0]?.balance ?? "0", 6);
}

export async function ensureCircleGatewayFunds(
  address: Address,
  requiredUSDC: string
) {
  const required = parseUnits(requiredUSDC, 6);
  const available = await gatewayBalance(address);
  if (available >= required) return;

  throw new Error(
    `Circle Gateway balance is too low. Available: ${formatUnits(available, 6)} USDC. Required: ${requiredUSDC} USDC.`
  );
}

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
