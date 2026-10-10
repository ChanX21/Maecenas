import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { initNetra, shutdownNetra } from "@/observability/netra";
import { initializeDatabase, seedDatabase } from "@/db/store";
import { loadEnv, validateEnvironment } from "@/env";
import { validateArcRpc } from "@/payments/circle-gateway";

loadEnv();

let startupStage = "validating environment";
let handleRequest: ((request: IncomingMessage, response: ServerResponse) => Promise<void>) | undefined;
const readiness = (async () => {
  try {
    validateEnvironment();
    if (process.env.PAYMENT_MODE === "real") {
      startupStage = "verifying Arc RPC network";
      await validateArcRpc();
    }
    startupStage = "initializing Netra";
    await initNetra();
    startupStage = "loading routes";
    handleRequest = (await import("@/http")).handleMaecenasRequest;
    startupStage = "initializing database";
    await initializeDatabase();
    startupStage = "seeding database";
    await seedDatabase();
    startupStage = "ready";
  } catch (error) {
    startupStage = "failed";
    console.error(JSON.stringify({ level: "error", event: "backend_startup_failed", error: String(error) }));
    return error;
  }
})();

function errorDetails(error: unknown): string {
  const messages: string[] = [];
  for (let current: unknown = error; current instanceof Error; current = current.cause) {
    messages.push(current.message);
  }
  return messages.join(" | ");
}

const port = Number(process.env.PORT ?? process.env.BACKEND_PORT ?? 4000);
const host = process.env.BACKEND_HOST ?? "0.0.0.0";

createServer(async (request, response) => {
  if (request.url?.split("?", 1)[0] === "/api/health" && startupStage !== "ready" && startupStage !== "failed") {
    response.statusCode = 503;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ ok: false, service: "maecenas-backend", startupStage }));
    return;
  }
  const startupError = await readiness;
  if (startupError) {
    console.error(JSON.stringify({
      level: "error",
      event: "backend_request_blocked_by_startup",
      error: errorDetails(startupError)
    }));
    const message = startupError instanceof Error && /required|SUPABASE_DATABASE_URL/.test(startupError.message)
      ? startupError.message
      : "Backend initialization failed. Check the backend service runtime logs.";
    response.statusCode = 500;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ error: "BACKEND_STARTUP_FAILED", message }));
    return;
  }
  await handleRequest!(request, response);
}).listen(port, host, () => {
  console.log(`Maecenas backend listening on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdownNetra().finally(() => process.exit(0));
  });
}
