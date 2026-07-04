import { loadEnv } from "@/env";
import { initializeDatabase, seedDatabase } from "@/db/store";

loadEnv();
await initializeDatabase();
console.log(`Ensured ${await seedDatabase()} seed sources exist`);
