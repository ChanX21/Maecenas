import { mkdirSync } from "fs";
import path from "path";
import { backupDatabase, closeDatabase, initializeDatabase } from "@/db/store";
import { loadEnv } from "@/env";

loadEnv();
initializeDatabase();

const directory = path.resolve(process.cwd(), process.env.BACKUP_DIRECTORY ?? "./data/backups");
mkdirSync(directory, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const destination = path.join(directory, `maecenas-${timestamp}.db`);

await backupDatabase(destination);
closeDatabase();
console.log(destination);
