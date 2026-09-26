const environment = process.env.NEXT_PUBLIC_ARC_ENVIRONMENT ?? "testnet";
if (environment !== "testnet" && environment !== "mainnet") {
  throw new Error("NEXT_PUBLIC_ARC_ENVIRONMENT must be testnet or mainnet");
}

export const arcEnvironment = environment;
export const arcChainId = environment === "mainnet" ? 5042 : 5042002;
export const arcName = environment === "mainnet" ? "Arc Mainnet" : "Arc Testnet";
export const arcRpcUrl =
  process.env.NEXT_PUBLIC_ARC_RPC_URL ??
  (environment === "testnet" ? "https://rpc.testnet.arc.network" : undefined);
export const arcExplorerUrl =
  process.env.NEXT_PUBLIC_ARC_EXPLORER_URL?.replace(/\/$/, "") ??
  (environment === "mainnet" ? "https://arcscan.app" : "https://testnet.arcscan.app");
export const circleGatewayUrl = environment === "mainnet"
  ? "https://gateway-api.circle.com"
  : "https://gateway-api-testnet.circle.com";

if (!arcRpcUrl) {
  throw new Error("NEXT_PUBLIC_ARC_RPC_URL is required for Arc mainnet");
}
