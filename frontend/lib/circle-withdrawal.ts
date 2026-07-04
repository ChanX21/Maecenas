import type { GatewayBurnIntent } from "@/types";
import type { Hex, WalletClient } from "viem";

const types = {
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

export async function signCircleGatewayWithdrawal(
  walletClient: WalletClient,
  burnIntent: GatewayBurnIntent
): Promise<Hex> {
  if (!walletClient.account) throw new Error("Dynamic wallet account is unavailable");
  return walletClient.signTypedData({
    account: walletClient.account,
    domain: { name: "GatewayWallet", version: "1" },
    types,
    primaryType: "BurnIntent",
    message: {
      ...burnIntent,
      maxBlockHeight: BigInt(burnIntent.maxBlockHeight),
      maxFee: BigInt(burnIntent.maxFee),
      spec: {
        ...burnIntent.spec,
        value: BigInt(burnIntent.spec.value)
      }
    }
  });
}
