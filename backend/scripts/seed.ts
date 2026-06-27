import { loadEnv } from "@/env";
import { initializeDatabase, seedDatabase } from "@/db/store";

loadEnv();
initializeDatabase();
console.log(`Ensured ${seedDatabase()} seed sources exist`);
