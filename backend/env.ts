import { existsSync, readFileSync } from "fs";
import path from "path";
import { getArcEnvironment } from "@/payments/arc-environment";
import { validateCirclePaymentEnvironment } from "@/payments/circle-gateway";
import { validateResearchEconomics } from "@/db/store";

export function validateEnvironment(): void {
  const environment = getArcEnvironment();
  if (!["mock", "real"].includes(process.env.PAYMENT_MODE ?? "mock")) {
    throw new Error("PAYMENT_MODE must be mock or real");
  }
  if (environment === "mainnet") {
    if (process.env.PAYMENT_MODE !== "real") throw new Error("Arc mainnet requires PAYMENT_MODE=real");
    if (process.env.DISABLE_RESEARCH_GUARDRAILS === "true") throw new Error("Mainnet research guardrails cannot be disabled");
    if (process.env.AI_MODE === "test") throw new Error("AI_MODE=test is not allowed on mainnet");
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required on mainnet");
  }
  validateResearchEconomics();
  if (process.env.NODE_ENV === "production" && !process.env.TOKEN_SIGNING_SECRET) {
    throw new Error("TOKEN_SIGNING_SECRET is required in production");
  }
  if (process.env.PAYMENT_MODE === "real") {
    for (const key of ["TOKEN_SIGNING_SECRET", "IP_HASH_SECRET", "CORS_ORIGIN", "ARC_ENVIRONMENT", "ARC_RPC_URL", "MAECENAS_TREASURY_WALLET_ADDRESS", "MAECENAS_AGENT_PRIVATE_KEY", "MAECENAS_AGENT_WALLET_ADDRESS", "PUBLIC_BACKEND_URL"]) {
      if (!process.env[key]) throw new Error(`${key} is required when PAYMENT_MODE=real`);
    }
    if (!process.env.ADMIN_TOKEN && !process.env.ADMIN_WALLETS) {
      throw new Error("ADMIN_TOKEN or ADMIN_WALLETS is required when PAYMENT_MODE=real");
    }
    validateCirclePaymentEnvironment();
  }
}

export function loadEnv() {
  const candidates = [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "../.env")];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    const raw = readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}
