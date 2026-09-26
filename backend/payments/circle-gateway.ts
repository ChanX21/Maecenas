import {
  GatewayClient
} from "@circle-fin/x402-batching/client";
import { BatchFacilitatorClient } from "@circle-fin/x402-batching/server";
import { privateKeyToAccount } from "viem/accounts";
import {
  getArcChainName,
  getArcConfig,
  getArcEnvironment,
  getArcNetwork,
  getCircleGatewayUrl
} from "@/payments/arc-environment";
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

const EVM_TX_HASH = /^0x[a-fA-F0-9]{64}$/;

export class CirclePaymentError extends Error {
  constructor(message: string, public mayHaveMoved: boolean, options?: ErrorOptions) {
    super(message, options);
  }
}

export function splitSettlementReference(reference?: string) {
  return {
    paymentId: reference || undefined,
    txHash: reference && EVM_TX_HASH.test(reference) ? reference : undefined
  };
}

export function validateCirclePaymentEnvironment(): void {
  const environment = getArcEnvironment();
  if (environment === "mainnet" && process.env.MAINNET_PAYMENTS_ENABLED !== "true") {
    throw new Error("MAINNET_PAYMENTS_ENABLED=true is required for Arc mainnet payments");
  }

  const privateKey = process.env.MAECENAS_AGENT_PRIVATE_KEY!;
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    throw new Error("MAECENAS_AGENT_PRIVATE_KEY must be a 0x-prefixed 32-byte key");
  }
  const configuredAddress = process.env.MAECENAS_AGENT_WALLET_ADDRESS?.toLowerCase();
  const derivedAddress = privateKeyToAccount(privateKey as `0x${string}`).address.toLowerCase();
  if (!configuredAddress || configuredAddress !== derivedAddress) {
    throw new Error("MAECENAS_AGENT_WALLET_ADDRESS does not match MAECENAS_AGENT_PRIVATE_KEY");
  }
  const treasuryAddress = process.env.MAECENAS_TREASURY_WALLET_ADDRESS?.toLowerCase();
  if (!treasuryAddress || !/^0x[a-f0-9]{40}$/.test(treasuryAddress)) {
    throw new Error("MAECENAS_TREASURY_WALLET_ADDRESS must be a valid EVM address");
  }
  if (treasuryAddress === derivedAddress) {
    throw new Error("MAECENAS_TREASURY_WALLET_ADDRESS must be different from the agent wallet");
  }
}

export function circlePaymentRequired(amountUSDC: string, payTo: string, resource: string): PaymentRequired {
  const config = getArcConfig();
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
        network: getArcNetwork(),
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
  let result;
  try {
    result = await new BatchFacilitatorClient({ url: getCircleGatewayUrl() }).settle(
      paymentPayload as never,
      required.accepts[0] as never
    );
  } catch (cause) {
    throw new CirclePaymentError("Circle Gateway settlement status is unknown", true, { cause });
  }
  if (!result.success) {
    throw new CirclePaymentError(`Circle Gateway settlement failed: ${result.errorReason ?? "unknown error"}`, false);
  }
  if (!result.transaction) {
    throw new CirclePaymentError("Circle Gateway settlement returned no payment reference", true);
  }
  return result;
}

export async function payCircleResource<T>(
  url: string,
  onAuthorized: (paymentProof: string) => Promise<void>
): Promise<{
  data: T;
  paymentId?: string;
  txHash?: string;
  network: string;
  payer: string;
}> {
  const privateKey = process.env.MAECENAS_AGENT_PRIVATE_KEY;
  if (!privateKey) throw new Error("MAECENAS_AGENT_PRIVATE_KEY is required for real evidence payouts");
  const client = new GatewayClient({
    chain: getArcChainName(),
    privateKey: privateKey as `0x${string}`,
    rpcUrl: process.env.ARC_RPC_URL || undefined
  });
  let authorizationCreated = false;
  client.onAfterPaymentCreation(async ({ paymentPayload }) => {
    authorizationCreated = true;
    await onAuthorized(JSON.stringify(paymentPayload));
  });
  let result;
  try {
    result = await client.pay<T>(url);
  } catch (cause) {
    throw new CirclePaymentError(
      authorizationCreated ? "Circle Gateway evidence payment status is unknown" : "Circle Gateway evidence payment was not submitted",
      authorizationCreated,
      { cause }
    );
  }
  if (!result.transaction) {
    throw new CirclePaymentError("Circle Gateway payment returned no payment reference", authorizationCreated);
  }
  return {
    data: result.data,
    ...splitSettlementReference(result.transaction),
    network: `eip155:${client.chainConfig.chain.id}`,
    payer: client.address
  };
}
