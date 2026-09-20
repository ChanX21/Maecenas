import assert from "node:assert/strict";
import test from "node:test";
import { basisPointShare, microsToUSDC, parseUSDCMicros } from "@/utils/money";

test("allocates 70% of a five-cent search to evidence", () => {
  assert.equal(microsToUSDC(basisPointShare(parseUSDCMicros("0.05"), 7000)), "0.035");
});
