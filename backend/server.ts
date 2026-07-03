import { createMaecenasServer } from "@/http";
import path from "path";
import { mkdirSync } from "fs";
import { backupDatabase, initializeDatabase, seedDatabase } from "@/db/store";
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

initializeDatabase();
seedDatabase();

const port = Number(process.env.BACKEND_PORT ?? 4000);
const host = process.env.BACKEND_HOST ?? "0.0.0.0";

createMaecenasServer().listen(port, host, () => {
  console.log(`Maecenas backend listening on http://localhost:${port}`);
});

const backupMinutes = Number(process.env.BACKUP_INTERVAL_MINUTES ?? 0);
if (backupMinutes > 0) {
  const directory = path.resolve(process.cwd(), process.env.BACKUP_DIRECTORY ?? "./data/backups");
  mkdirSync(directory, { recursive: true });
  setInterval(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    void backupDatabase(path.join(directory, `maecenas-${timestamp}.db`)).catch(console.error);
  }, backupMinutes * 60_000).unref();
}
