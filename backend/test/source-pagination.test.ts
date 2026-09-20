import assert from "node:assert/strict";
import test from "node:test";
import { sourcePageParams } from "@/http";

test("source pagination normalizes defaults and bounds page size", () => {
  assert.deepEqual(sourcePageParams(new URLSearchParams()), { page: 1, pageSize: 24 });
  assert.deepEqual(sourcePageParams(new URLSearchParams("page=3&pageSize=12")), { page: 3, pageSize: 12 });
  assert.deepEqual(sourcePageParams(new URLSearchParams("page=-1&pageSize=999")), { page: 1, pageSize: 100 });
  assert.deepEqual(sourcePageParams(new URLSearchParams("page=nope&pageSize=0")), { page: 1, pageSize: 1 });
});
