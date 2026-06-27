import { loadEnv } from "@/env";
import { initializeDatabase, reviewSource } from "@/db/store";

const [sourceId, status, ...reasonParts] = process.argv.slice(2);
if (!sourceId || (status !== "approved" && status !== "rejected")) {
  console.error("Usage: npm run source:review -- <source-id> <approved|rejected> [reason]");
  process.exit(1);
}

loadEnv();
initializeDatabase();
const source = reviewSource(sourceId, status, reasonParts.join(" ") || undefined);
console.log(`${source.id}: ${source.status}`);
