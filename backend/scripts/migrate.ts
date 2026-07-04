import { loadEnv } from "@/env";
import { initializeDatabase } from "@/db/store";

loadEnv();
await initializeDatabase();
console.log("Database migrations applied");
