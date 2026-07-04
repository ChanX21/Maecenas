import { randomBytes } from "node:crypto";
import { CHAIN_CONFIGS } from "@circle-fin/x402-batching/client";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  pad,
  parseUnits,
  verifyTypedData,
  zeroAddress,
  type Address,
  type Hex
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const config = CHAIN_CONFIGS.arcTestnet;
const gatewayApi = "https://gateway-api-testnet.circle.com/v1";
const gatewayMinterAbi = [{
  type: "function",
  name: "gatewayMint",
  stateMutability: "nonpayable",
  inputs: [
    { name: "attestation", type: "bytes" },
    { name: "signature", type: "bytes" }
  ],
  outputs: []
}] as const;

const transferTypes = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" }
  ],
  TransferSpec: [
    { name: "version", type: "uint32" },
    { name: "sourceDomain", type: "uint32" },
    { name: "destinationDomain", type: "uint32" },
    { name: "sourceContract", type: "bytes32" },
    { name: "destinationContract", type: "bytes32" },
    { name: "sourceToken", type: "bytes32" },
    { name: "destinationToken", type: "bytes32" },
    { name: "sourceDepositor", type: "bytes32" },
    { name: "destinationRecipient", type: "bytes32" },
    { name: "sourceSigner", type: "bytes32" },
    { name: "destinationCaller", type: "bytes32" },
    { name: "value", type: "uint256" },
    { name: "salt", type: "bytes32" },
    { name: "hookData", type: "bytes" }
  ],
  BurnIntent: [
    { name: "maxBlockHeight", type: "uint256" },
    { name: "maxFee", type: "uint256" },
    { name: "spec", type: "TransferSpec" }
  ]
} as const;

export type GatewayTransferSpec = {
  version: number;
  sourceDomain: number;
  destinationDomain: number;
  sourceContract: Hex;
  destinationContract: Hex;
  sourceToken: Hex;
  destinationToken: Hex;
  sourceDepositor: Hex;
  destinationRecipient: Hex;
  sourceSigner: Hex;
  destinationCaller: Hex;
  value: string;
  salt: Hex;
  hookData: Hex;
};

export type GatewayBurnIntent = {
  maxBlockHeight: string;
  maxFee: string;
  spec: GatewayTransferSpec;
};

export class GatewayWithdrawalError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

function agentAccount() {
  const value = process.env.MAECENAS_AGENT_PRIVATE_KEY?.trim();
  const key = value?.startsWith("0x") ? value : value ? `0x${value}` : "";
  if (!/^0x[a-fA-F0-9]{64}$/.test(key)) {
    throw new GatewayWithdrawalError(503, "WITHDRAWAL_NOT_CONFIGURED", "Agent wallet is not configured for withdrawals");
  }
  return privateKeyToAccount(key as Hex);
}

function bytes32(address: string): Hex {
  return pad(address.toLowerCase() as Address, { size: 32 });
}

function transferSpec(wallet: string, caller: string, value: bigint): GatewayTransferSpec {
  return {
    version: 1,
    sourceDomain: config.domain,
    destinationDomain: config.domain,
    sourceContract: bytes32(config.gatewayWallet),
    destinationContract: bytes32(config.gatewayMinter),
    sourceToken: bytes32(config.usdc),
    destinationToken: bytes32(config.usdc),
    sourceDepositor: bytes32(wallet),
    destinationRecipient: bytes32(wallet),
    sourceSigner: bytes32(wallet),
    destinationCaller: bytes32(caller),
    value: value.toString(),
    salt: `0x${randomBytes(32).toString("hex")}`,
    hookData: "0x"
  };
}

async function gatewayRequest(path: string, body: unknown) {
  const response = await fetch(`${gatewayApi}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data ? String(data.message) : response.statusText;
    throw new GatewayWithdrawalError(502, "CIRCLE_GATEWAY_ERROR", message || "Circle Gateway request failed");
  }
  return data;
}

async function availableMicros(wallet: string): Promise<bigint> {
  const data = await gatewayRequest("/balances", {
    token: "USDC",
    sources: [{ depositor: wallet, domain: config.domain }]
  }) as { balances?: Array<{ balance?: string }> };
  return parseUnits(data.balances?.[0]?.balance ?? "0", 6);
}

async function estimate(spec: GatewayTransferSpec): Promise<{ maxBlockHeight: string; maxFee: bigint }> {
  const data = await gatewayRequest("/estimate", [{ spec }]) as
    | Array<{ burnIntent?: { maxBlockHeight?: string; maxFee?: string } }>
    | { body?: Array<{ burnIntent?: { maxBlockHeight?: string; maxFee?: string } }> };
  const item = Array.isArray(data) ? data[0] : data.body?.[0];
  const maxBlockHeight = item?.burnIntent?.maxBlockHeight;
  const maxFee = item?.burnIntent?.maxFee;
  if (!maxBlockHeight || !maxFee) {
    throw new GatewayWithdrawalError(502, "INVALID_GATEWAY_QUOTE", "Circle Gateway returned an incomplete withdrawal quote");
  }
  return { maxBlockHeight, maxFee: BigInt(maxFee) };
}

export async function createGatewayWithdrawalQuote(wallet: string) {
  if (process.env.PAYMENT_MODE !== "real") {
    throw new GatewayWithdrawalError(409, "WITHDRAWAL_UNAVAILABLE", "Gateway withdrawals are only available in real payment mode");
  }
  const caller = agentAccount().address;
  const balance = await availableMicros(wallet);
  if (balance === 0n) {
    return { canWithdraw: false, balanceUSDC: "0", feeUSDC: "0", amountUSDC: "0" };
  }

  let amount = balance;
  let quote = await estimate(transferSpec(wallet, caller, amount));
  if (balance <= quote.maxFee) {
    return {
      canWithdraw: false,
      balanceUSDC: formatUnits(balance, 6),
      feeUSDC: formatUnits(quote.maxFee, 6),
      amountUSDC: "0",
      minimumBalanceUSDC: formatUnits(quote.maxFee + 1n, 6)
    };
  }

  amount = balance - quote.maxFee;
  const spec = transferSpec(wallet, caller, amount);
  quote = await estimate(spec);
  amount = balance - quote.maxFee;
  const burnIntent: GatewayBurnIntent = {
    maxBlockHeight: quote.maxBlockHeight,
    maxFee: quote.maxFee.toString(),
    spec: { ...spec, value: amount.toString() }
  };

  return {
    canWithdraw: true,
    balanceUSDC: formatUnits(balance, 6),
    feeUSDC: formatUnits(quote.maxFee, 6),
    amountUSDC: formatUnits(amount, 6),
    burnIntent
  };
}

export function validateGatewayWithdrawalIntent(
  burnIntent: GatewayBurnIntent,
  wallet: string,
  caller: string,
  available: bigint
) {
  if (!burnIntent?.spec) {
    throw new GatewayWithdrawalError(400, "INVALID_WITHDRAWAL_INTENT", "Withdrawal intent is missing");
  }
  let value: bigint;
  let maxFee: bigint;
  let maxBlockHeight: bigint;
  try {
    value = BigInt(burnIntent.spec.value);
    maxFee = BigInt(burnIntent.maxFee);
    maxBlockHeight = BigInt(burnIntent.maxBlockHeight);
  } catch {
    throw new GatewayWithdrawalError(400, "INVALID_WITHDRAWAL_INTENT", "Withdrawal amount or fee is invalid");
  }
  const expected = transferSpec(wallet, caller, BigInt(burnIntent.spec.value));
  const fields: Array<keyof GatewayTransferSpec> = [
    "sourceDomain",
    "destinationDomain",
    "sourceContract",
    "destinationContract",
    "sourceToken",
    "destinationToken",
    "sourceDepositor",
    "destinationRecipient",
    "sourceSigner",
    "destinationCaller",
    "hookData"
  ];
  if (
    burnIntent.spec.version !== 1 ||
    !/^0x[a-fA-F0-9]{64}$/.test(burnIntent.spec.salt) ||
    fields.some((field) => String(burnIntent.spec[field]).toLowerCase() !== String(expected[field]).toLowerCase())
  ) {
    throw new GatewayWithdrawalError(400, "INVALID_WITHDRAWAL_INTENT", "Withdrawal intent does not match the authenticated Arc wallet");
  }
  if (value <= 0n || maxFee < 0n || maxBlockHeight <= 0n || value + maxFee > available) {
    throw new GatewayWithdrawalError(409, "INSUFFICIENT_GATEWAY_BALANCE", "Gateway balance no longer covers the withdrawal and fee");
  }
}

export async function executeGatewayWithdrawal(wallet: string, burnIntent: GatewayBurnIntent, signature: string) {
  const account = agentAccount();
  const balance = await availableMicros(wallet);
  validateGatewayWithdrawalIntent(burnIntent, wallet, account.address, balance);
  const signatureValid = await verifyTypedData({
    address: wallet as Address,
    domain: { name: "GatewayWallet", version: "1" },
    types: transferTypes,
    primaryType: "BurnIntent",
    message: {
      ...burnIntent,
      maxBlockHeight: BigInt(burnIntent.maxBlockHeight),
      maxFee: BigInt(burnIntent.maxFee),
      spec: {
        ...burnIntent.spec,
        value: BigInt(burnIntent.spec.value)
      }
    },
    signature: signature as Hex
  });
  if (!signatureValid) {
    throw new GatewayWithdrawalError(400, "INVALID_WITHDRAWAL_SIGNATURE", "Creator wallet signature is invalid");
  }

  const transfer = await gatewayRequest("/transfer", [{ burnIntent, signature }]) as {
    transferId?: string;
    attestation?: Hex;
    signature?: Hex;
    error?: string;
    message?: string;
  };
  if (!transfer.attestation || !transfer.signature) {
    throw new GatewayWithdrawalError(502, "INVALID_GATEWAY_ATTESTATION", transfer.message ?? transfer.error ?? "Circle Gateway returned no attestation");
  }

  const transport = http(process.env.ARC_RPC_URL || config.rpcUrl);
  const walletClient = createWalletClient({ account, chain: config.chain, transport });
  const publicClient = createPublicClient({ chain: config.chain, transport });
  const txHash = await walletClient.writeContract({
    address: config.gatewayMinter,
    abi: gatewayMinterAbi,
    functionName: "gatewayMint",
    args: [transfer.attestation, transfer.signature]
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new GatewayWithdrawalError(502, "WITHDRAWAL_TRANSACTION_FAILED", `Arc withdrawal transaction failed: ${txHash}`);
  }

  return {
    txHash,
    transferId: transfer.transferId,
    amountUSDC: formatUnits(BigInt(burnIntent.spec.value), 6),
    feeUSDC: formatUnits(BigInt(burnIntent.maxFee), 6)
  };
}
