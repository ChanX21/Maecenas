import {
  CHAIN_CONFIGS,
  GatewayClient,
  type SupportedChainName
} from "@circle-fin/x402-batching/client";
import { BatchFacilitatorClient } from "@circle-fin/x402-batching/server";
import { parseUSDCMicros } from "@/utils/money";

export type PaymentRequirements = {
  scheme: "exact";
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: {
    name: "GatewayWalletBatched";
    version: "1";
    verifyingContract: string;
  };
};

export type PaymentRequired = {
  x402Version: 2;
  resource: { url: string; description: string; mimeType: "application/json" };
  accepts: PaymentRequirements[];
};

function chainName(): SupportedChainName {
  return (process.env.CIRCLE_GATEWAY_CHAIN ?? "arcTestnet") as SupportedChainName;
}

function facilitatorUrl(): string {
  return process.env.GATEWAY_API_URL || "https://gateway-api-testnet.circle.com";
}

export function circlePaymentRequired(amountUSDC: string, payTo: string, resource: string): PaymentRequired {
  const config = CHAIN_CONFIGS[chainName()];
  if (!config) throw new Error(`Unsupported CIRCLE_GATEWAY_CHAIN: ${chainName()}`);
  return {
    x402Version: 2,
    resource: {
      url: resource,
      description: "Maecenas research funding",
      mimeType: "application/json"
    },
    accepts: [
      {
        scheme: "exact",
        network: `eip155:${config.chain.id}`,
        asset: config.usdc,
        amount: String(parseUSDCMicros(amountUSDC)),
        payTo,
        maxTimeoutSeconds: 604_900,
        extra: {
          name: "GatewayWalletBatched",
          version: "1",
          verifyingContract: config.gatewayWallet
        }
      }
    ]
  };
}

export async function settleCirclePayment(paymentPayload: unknown, required: PaymentRequired) {
  const result = await new BatchFacilitatorClient({ url: facilitatorUrl() }).settle(
    paymentPayload as never,
    required.accepts[0] as never
  );
  if (!result.success) throw new Error(`Circle Gateway settlement failed: ${result.errorReason ?? "unknown error"}`);
  return result;
}

export async function payCircleResource<T>(url: string): Promise<{
  data: T;
  transaction: string;
  network: string;
  payer: string;
}> {
  const privateKey = process.env.MAECENAS_AGENT_PRIVATE_KEY;
  if (!privateKey) throw new Error("MAECENAS_AGENT_PRIVATE_KEY is required for real evidence payouts");
  const client = new GatewayClient({
    chain: chainName(),
    privateKey: privateKey as `0x${string}`,
    rpcUrl: process.env.ARC_RPC_URL || undefined
  });
  const result = await client.pay<T>(url);
  return {
    data: result.data,
    transaction: result.transaction,
    network: `eip155:${client.chainConfig.chain.id}`,
    payer: client.address
  };
}
