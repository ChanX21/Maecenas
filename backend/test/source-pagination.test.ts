import assert from "node:assert/strict";
import test from "node:test";
import { sourcePageParams, sourceSearchQuery } from "@/http";

test("source pagination normalizes defaults and bounds page size", () => {
  assert.deepEqual(sourcePageParams(new URLSearchParams()), { page: 1, pageSize: 24 });
  assert.deepEqual(sourcePageParams(new URLSearchParams("page=3&pageSize=12")), { page: 3, pageSize: 12 });
  assert.deepEqual(sourcePageParams(new URLSearchParams("page=-1&pageSize=999")), { page: 1, pageSize: 100 });
  assert.deepEqual(sourcePageParams(new URLSearchParams("page=nope&pageSize=0")), { page: 1, pageSize: 1 });
});

test("source search normalizes optional queries without changing pagination", () => {
  assert.equal(sourceSearchQuery(new URLSearchParams()), "");
  assert.equal(sourceSearchQuery(new URLSearchParams("q=%20stablecoin%20")), "stablecoin");
  assert.equal(sourceSearchQuery(new URLSearchParams(`q=${"x".repeat(120)}`)).length, 100);
  assert.deepEqual(sourcePageParams(new URLSearchParams("q=stablecoin&page=2&pageSize=6")), { page: 2, pageSize: 6 });
});
