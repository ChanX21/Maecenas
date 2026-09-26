import assert from "node:assert/strict";
import test from "node:test";
import { pad, type Address } from "viem";
import {
  GatewayWithdrawalError,
  validateGatewayWithdrawalIntent,
  type GatewayBurnIntent
} from "@/payments/gateway-withdrawal";
import { getArcConfig } from "@/payments/arc-environment";

const wallet = "0x1111111111111111111111111111111111111111";
const caller = "0x2222222222222222222222222222222222222222";
const bytes32 = (address: string) => pad(address as Address, { size: 32 });

function intent(): GatewayBurnIntent {
  const config = getArcConfig();
  return {
    maxBlockHeight: "99999999",
    maxFee: "3850",
    spec: {
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
      value: "1000",
      salt: `0x${"ab".repeat(32)}`,
      hookData: "0x"
    }
  };
}

test("withdrawal intent is restricted to its authenticated creator wallet", () => {
  process.env.ARC_ENVIRONMENT = "testnet";
  process.env.MIN_GATEWAY_WITHDRAWAL_USDC = "0.000001";
  assert.doesNotThrow(() => validateGatewayWithdrawalIntent(intent(), wallet, caller, 4850n));
  const tampered = intent();
  tampered.spec.destinationRecipient = bytes32(caller);
  assert.throws(
    () => validateGatewayWithdrawalIntent(tampered, wallet, caller, 4850n),
    (error) => error instanceof GatewayWithdrawalError && error.code === "INVALID_WITHDRAWAL_INTENT"
  );
  const unsafeFee = intent();
  unsafeFee.maxFee = "50001";
  assert.throws(
    () => validateGatewayWithdrawalIntent(unsafeFee, wallet, caller, 51001n),
    (error) => error instanceof GatewayWithdrawalError && error.code === "UNSAFE_WITHDRAWAL_TERMS"
  );
  delete process.env.MIN_GATEWAY_WITHDRAWAL_USDC;
  delete process.env.ARC_ENVIRONMENT;
});

test("withdrawal validation uses Arc mainnet contracts when selected", () => {
  process.env.ARC_ENVIRONMENT = "mainnet";
  process.env.MIN_GATEWAY_WITHDRAWAL_USDC = "0.000001";
  try {
    assert.doesNotThrow(() => validateGatewayWithdrawalIntent(intent(), wallet, caller, 4850n));
  } finally {
    delete process.env.ARC_ENVIRONMENT;
    delete process.env.MIN_GATEWAY_WITHDRAWAL_USDC;
  }
});
