import assert from "node:assert/strict";
import test from "node:test";
import { pad, type Address } from "viem";
import {
  GatewayWithdrawalError,
  validateGatewayWithdrawalIntent,
  type GatewayBurnIntent
} from "@/payments/gateway-withdrawal";

const wallet = "0x1111111111111111111111111111111111111111";
const caller = "0x2222222222222222222222222222222222222222";
const bytes32 = (address: string) => pad(address as Address, { size: 32 });

function intent(): GatewayBurnIntent {
  return {
    maxBlockHeight: "99999999",
    maxFee: "3850",
    spec: {
      version: 1,
      sourceDomain: 26,
      destinationDomain: 26,
      sourceContract: bytes32("0x0077777d7EBA4688BDeF3E311b846F25870A19B9"),
      destinationContract: bytes32("0x0022222ABE238Cc2C7Bb1f21003F0a260052475B"),
      sourceToken: bytes32("0x3600000000000000000000000000000000000000"),
      destinationToken: bytes32("0x3600000000000000000000000000000000000000"),
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
  assert.doesNotThrow(() => validateGatewayWithdrawalIntent(intent(), wallet, caller, 4850n));
  const tampered = intent();
  tampered.spec.destinationRecipient = bytes32(caller);
  assert.throws(
    () => validateGatewayWithdrawalIntent(tampered, wallet, caller, 4850n),
    (error) => error instanceof GatewayWithdrawalError && error.code === "INVALID_WITHDRAWAL_INTENT"
  );
});
