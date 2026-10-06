import assert from "node:assert/strict";
import test from "node:test";
import { recoverCommissionContext, verifyGatewayPayment, type GatewayTransfer, type PaymentRecord } from "@/payments/gateway-proof";

const record: PaymentRecord = {
  paymentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  network: "eip155:5042002",
  payerWallet: "0x1111111111111111111111111111111111111111",
  recipientWallet: "0x2222222222222222222222222222222222222222",
  amountUSDC: "0.01",
  status: "paid"
};
const transfer: GatewayTransfer = {
  id: record.paymentId!, status: "received", token: "USDC",
  sendingNetwork: record.network!, recipientNetwork: record.network!,
  fromAddress: record.payerWallet!, toAddress: record.recipientWallet!,
  amount: "10000", txHash: null, updatedAt: "2026-10-06T00:00:00Z"
};
const hash = `0x${"ab".repeat(32)}`;

test("Gateway verification compares saved fields, preserves every status, and fails closed", async (t) => {
  const calls: string[] = [];
  let response: unknown = transfer;
  let httpStatus = 200;
  let failure: Error | undefined;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls.push(String(url));
    assert.ok(init.signal);
    if (failure) throw failure;
    return new Response(JSON.stringify(response), { status: httpStatus });
  });

  for (const status of ["received", "batched", "confirmed", "completed", "failed"] as const) {
    response = { ...transfer, status, txHash: status === "received" ? null : hash, secret: "must not be forwarded" };
    const proof = await verifyGatewayPayment(record);
    assert.equal(proof.verification, "matched", status);
    assert.equal(proof.transfer?.status, status);
    assert.equal("checks" in proof, false, "Do not expose per-field match diagnostics");
    assert.equal(proof.batchExplorerUrl, status === "received" ? undefined : `https://testnet.arcscan.app/tx/${hash}`);
    assert.equal((proof.transfer as unknown as Record<string, unknown>).secret, undefined);
  }
  assert.equal(calls[0], `https://gateway-api-testnet.circle.com/v1/x402/transfers/${record.paymentId}`);

  for (const [field, value] of [
    ["id", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
    ["fromAddress", record.recipientWallet],
    ["toAddress", record.payerWallet],
    ["amount", "10001"],
    ["token", "EURC"],
    ["sendingNetwork", "eip155:5042"],
    ["recipientNetwork", "eip155:5042"]
  ]) {
    response = { ...transfer, txHash: hash, [field!]: value };
    const proof = await verifyGatewayPayment(record);
    assert.equal(proof.verification, "mismatch", field);
    assert.equal("checks" in proof, false, "Do not expose which field mismatched");
    assert.equal(proof.batchExplorerUrl, undefined);
  }

  response = { ...transfer, amount: "010000", fromAddress: transfer.fromAddress.toUpperCase(), toAddress: transfer.toAddress.toUpperCase() };
  assert.equal((await verifyGatewayPayment(record)).verification, "matched");
  response = { ...transfer, txHash: hash, sendingNetwork: "eip155:5042", recipientNetwork: "eip155:5042" };
  const mainnet = await verifyGatewayPayment({ ...record, network: "eip155:5042" });
  assert.equal(mainnet.verification, "matched");
  assert.equal(mainnet.circleUrl, `https://gateway-api.circle.com/v1/x402/transfers/${record.paymentId}`);
  assert.equal(mainnet.batchExplorerUrl, `https://arcscan.app/tx/${hash}`);

  const before = calls.length;
  for (const missing of [{ paymentId: undefined }, { network: undefined }, { network: "eip155:1" },
    { paymentId: "../../secrets" }, { payerWallet: undefined }, { recipientWallet: undefined }]) {
    assert.equal((await verifyGatewayPayment({ ...record, ...missing })).verification, "incomplete");
  }
  assert.equal((await verifyGatewayPayment({ ...record, status: "mock" })).verification, "mock");
  assert.equal(calls.length, before, "Incomplete and mock records must not query Circle");

  for (const malformed of [null, {}, { ...transfer, amount: "0.01" }, { ...transfer, status: "new-status" },
    { ...transfer, txHash: "javascript:alert(1)" }, { ...transfer, updatedAt: "invalid" }]) {
    response = malformed;
    assert.equal((await verifyGatewayPayment(record)).verification, "unavailable");
  }
  response = transfer;
  for (const status of [404, 429, 500]) {
    httpStatus = status;
    const proof = await verifyGatewayPayment(record);
    assert.equal(proof.verification, "unavailable");
    assert.ok(proof.circleUrl);
  }
  httpStatus = 200;
  failure = new DOMException("Timeout", "TimeoutError");
  assert.equal((await verifyGatewayPayment(record)).verification, "unavailable");
});

test("historical commission context is recovered only from consistent saved requirements", () => {
  const payload = {
    accepted: { scheme: "exact", network: record.network, payTo: record.recipientWallet, amount: "10000" },
    payload: { authorization: { from: record.payerWallet, to: record.recipientWallet, value: "10000" } }
  };
  const recover = (value: unknown) => recoverCommissionContext(JSON.stringify(value), record.payerWallet!, record.amountUSDC);
  assert.deepEqual(recover(payload), { network: record.network, recipientWallet: record.recipientWallet });
  assert.deepEqual(recover({ ...payload, accepted: { ...payload.accepted, network: "eip155:1" } }), {});
  assert.deepEqual(recover({ ...payload, accepted: { ...payload.accepted, amount: "9999" } }), {});
  assert.deepEqual(recover({ ...payload, payload: { authorization: { ...payload.payload.authorization, to: record.payerWallet } } }), {});
  assert.deepEqual(recover({ ...payload, payload: { authorization: { ...payload.payload.authorization, from: record.recipientWallet } } }), {});
  assert.deepEqual(recover({ ...payload, payload: { authorization: { ...payload.payload.authorization, value: "9999" } } }), {});
  for (const missing of [null, {}, { payload: { nonce: "old-record" } }]) assert.deepEqual(recover(missing), {});
  assert.deepEqual(recoverCommissionContext("not json", record.payerWallet!, "0.01"), {});
});
