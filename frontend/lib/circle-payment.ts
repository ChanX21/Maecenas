import { BatchEvmScheme, CHAIN_CONFIGS } from "@circle-fin/x402-batching/client";
import {
  createPublicClient,
  erc20Abi,
  formatUnits,
  http,
  parseUnits,
  type Address,
  type Hex,
  type WalletClient
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
const arcRpcUrl =
  process.env.NEXT_PUBLIC_ARC_RPC_URL ??
  arc.rpcUrl ??
  arc.chain.rpcUrls.default.http[0];
const gatewayWalletAbi = [{
  type: "function",
  name: "deposit",
  stateMutability: "nonpayable",
  inputs: [
    { name: "token", type: "address" },
    { name: "value", type: "uint256" }
  ],
  outputs: []
}] as const;

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
  walletClient: WalletClient,
  address: Address,
  requiredUSDC: string
) {
  if (!walletClient.account) throw new Error("Dynamic wallet account is unavailable");
  const required = parseUnits(requiredUSDC, 6);
  const available = await gatewayBalance(address);
  if (available >= required) return;

  const depositAmount = required - available;
  if (!arcRpcUrl) {
    throw new Error("Arc Testnet RPC URL is missing from the frontend configuration");
  }
  const publicClient = createPublicClient({
    chain: arc.chain,
    transport: http(arcRpcUrl)
  });
  const walletBalance = await publicClient.readContract({
    address: arc.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address]
  });
  if (walletBalance < depositAmount) {
    throw new Error(`Wallet needs ${formatUnits(depositAmount, 6)} USDC on Arc Testnet`);
  }

  const allowance = await publicClient.readContract({
    address: arc.usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address, arc.gatewayWallet]
  });
  if (allowance < depositAmount) {
    const approval = await walletClient.writeContract({
      account: walletClient.account,
      chain: arc.chain,
      address: arc.usdc,
      abi: erc20Abi,
      functionName: "approve",
      args: [arc.gatewayWallet, depositAmount]
    });
    await publicClient.waitForTransactionReceipt({ hash: approval });
  }

  const deposit = await walletClient.writeContract({
    account: walletClient.account,
    chain: arc.chain,
    address: arc.gatewayWallet,
    abi: gatewayWalletAbi,
    functionName: "deposit",
    args: [arc.usdc, depositAmount]
  });
  await publicClient.waitForTransactionReceipt({ hash: deposit });

  for (let attempt = 0; attempt < 15; attempt += 1) {
    if (await gatewayBalance(address) >= required) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error("Circle Gateway deposit is still finalizing; retry the payment shortly");
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
