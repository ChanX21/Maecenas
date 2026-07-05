import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createMaecenasServer } from "@/http";

test("CORS allows configured origins and rejects others", async () => {
  const previous = process.env.CORS_ORIGIN;
  process.env.CORS_ORIGIN = "https://www.maecenas.in, https://maecenas.vercel.app/";
  const server = createMaecenasServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    for (const origin of ["https://www.maecenas.in", "https://maecenas.vercel.app"]) {
      const response = await fetch(`${base}/api/health`, { method: "OPTIONS", headers: { Origin: origin } });
      assert.equal(response.headers.get("access-control-allow-origin"), origin);
      assert.match(response.headers.get("vary") ?? "", /Origin/);
    }

    const rejected = await fetch(`${base}/api/health`, {
      method: "OPTIONS",
      headers: { Origin: "https://example.com" }
    });
    assert.equal(rejected.headers.get("access-control-allow-origin"), null);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previous === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = previous;
  }
});
