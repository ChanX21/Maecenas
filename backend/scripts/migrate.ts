import { loadEnv } from "@/env";
import { initializeDatabase } from "@/db/store";

loadEnv();
initializeDatabase();
console.log("Database migrations applied");
