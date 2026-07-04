import { GatewayClient, type SupportedChainName } from "@circle-fin/x402-batching/client";
import { loadEnv } from "@/env";

function usage(): never {
  console.error("Usage: npm run gateway:deposit -- [amountUSDC] [--check]");
  console.error("  amountUSDC  USDC to deposit (default: 5). Skipped when gateway balance is already sufficient.");
  console.error("  --check     Print balances only; do not deposit.");
  process.exit(1);
}

function normalizePrivateKey(value: string): `0x${string}` {
  const trimmed = value.trim();
  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("Private key must be a 32-byte hex string (optionally prefixed with 0x)");
  }
  return `0x${hex}` as `0x${string}`;
}

function chainName(): SupportedChainName {
  return (process.env.CIRCLE_GATEWAY_CHAIN ?? "arcTestnet") as SupportedChainName;
}

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const amountArg = args.find((arg) => arg !== "--check");
const amountUSDC = amountArg ?? "5";
if (!/^\d+(\.\d+)?$/.test(amountUSDC)) usage();

loadEnv();

const privateKeyRaw = process.env.MAECENAS_AGENT_PRIVATE_KEY;
if (!privateKeyRaw) {
  console.error("MAECENAS_AGENT_PRIVATE_KEY is required");
  process.exit(1);
}

const privateKey = normalizePrivateKey(privateKeyRaw);
const client = new GatewayClient({
  chain: chainName(),
  privateKey,
  rpcUrl: process.env.ARC_RPC_URL || undefined
});

console.log(`Chain: ${chainName()}`);
console.log(`Wallet: ${client.address}`);

const before = await client.getBalances();
console.log(`Wallet USDC: ${before.wallet.formatted}`);
console.log(`Gateway available: ${before.gateway.formattedAvailable} USDC`);
console.log(`Gateway total: ${before.gateway.formattedTotal} USDC`);

if (checkOnly) {
  process.exit(0);
}

const targetMicros = BigInt(Math.round(Number(amountUSDC) * 1_000_000));
if (before.gateway.available >= targetMicros) {
  console.log(`Gateway balance already covers ${amountUSDC} USDC; skipping deposit.`);
  process.exit(0);
}

console.log(`Depositing ${amountUSDC} USDC into Circle Gateway...`);
const deposit = await client.deposit(amountUSDC);
console.log(`Deposit tx: ${deposit.depositTxHash}`);

let after = await client.getBalances();
for (let attempt = 0; attempt < 10 && after.gateway.available < targetMicros; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  after = await client.getBalances();
}

console.log(`Wallet USDC after: ${after.wallet.formatted}`);
console.log(`Gateway available after: ${after.gateway.formattedAvailable} USDC`);
if (after.gateway.available < targetMicros) {
  console.log("Gateway attestation is still pending; run npm run gateway:balance again in a few seconds.");
}
