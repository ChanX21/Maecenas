import assert from "node:assert/strict";
import test from "node:test";
import { splitSettlementReference } from "@/payments/circle-gateway";

test("separates Gateway payment IDs from EVM transaction hashes", () => {
  const paymentId = "10d391a5-a727-4c68-9f3e-7264a900def4";
  const txHash = `0x${"ab".repeat(32)}`;

  assert.deepEqual(splitSettlementReference(paymentId), {
    paymentId,
    txHash: undefined
  });
  assert.deepEqual(splitSettlementReference(txHash), {
    paymentId: txHash,
    txHash
  });
});
