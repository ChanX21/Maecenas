import { CHAIN_CONFIGS, type SupportedChainName } from "@circle-fin/x402-batching/client";

export type ArcEnvironment = "testnet" | "mainnet";

export function getArcEnvironment(): ArcEnvironment {
  const environment = process.env.ARC_ENVIRONMENT ?? "testnet";
  if (environment !== "testnet" && environment !== "mainnet") {
    throw new Error("ARC_ENVIRONMENT must be testnet or mainnet");
  }
  return environment;
}

export function getArcChainName(): SupportedChainName {
  return getArcEnvironment() === "mainnet" ? "arc" : "arcTestnet";
}

export function getArcConfig() {
  return CHAIN_CONFIGS[getArcChainName()];
}

export function getArcNetwork(): string {
  return `eip155:${getArcConfig().chain.id}`;
}

export function getCircleGatewayUrl(): string {
  return getArcEnvironment() === "mainnet"
    ? "https://gateway-api.circle.com"
    : "https://gateway-api-testnet.circle.com";
}
