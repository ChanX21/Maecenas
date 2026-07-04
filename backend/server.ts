import { createMaecenasServer } from "@/http";
import { initializeDatabase, seedDatabase } from "@/db/store";
import { loadEnv } from "@/env";

loadEnv();

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

await initializeDatabase();
await seedDatabase();

const port = Number(process.env.PORT ?? process.env.BACKEND_PORT ?? 4000);
const host = process.env.BACKEND_HOST ?? "0.0.0.0";

createMaecenasServer().listen(port, host, () => {
  console.log(`Maecenas backend listening on http://${host}:${port}`);
});
