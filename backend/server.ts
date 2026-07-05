import { createServer } from "node:http";
import { handleMaecenasRequest } from "@/http";
import { initializeDatabase, seedDatabase } from "@/db/store";
import { loadEnv } from "@/env";

loadEnv();

function validateEnvironment() {
  if (process.env.NODE_ENV === "production" && !process.env.TOKEN_SIGNING_SECRET) {
    throw new Error("TOKEN_SIGNING_SECRET is required in production");
  }
  if (process.env.PAYMENT_MODE === "real") {
    for (const key of ["TOKEN_SIGNING_SECRET", "IP_HASH_SECRET", "CORS_ORIGIN", "GATEWAY_API_URL", "MAECENAS_TREASURY_WALLET_ADDRESS", "MAECENAS_AGENT_PRIVATE_KEY", "PUBLIC_BACKEND_URL"]) {
      if (!process.env[key]) throw new Error(`${key} is required when PAYMENT_MODE=real`);
    }
    if (!process.env.ADMIN_TOKEN && !process.env.ADMIN_WALLETS) {
      throw new Error("ADMIN_TOKEN or ADMIN_WALLETS is required when PAYMENT_MODE=real");
    }
  }
}

let startupStage = "validating environment";
const readiness = (async () => {
  try {
    validateEnvironment();
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
  await handleMaecenasRequest(request, response);
}).listen(port, host, () => {
  console.log(`Maecenas backend listening on http://${host}:${port}`);
});
