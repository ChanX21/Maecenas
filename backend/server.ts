import { createMecenasServer } from "@/http";
import { initializeDatabase, seedDatabase } from "@/db/store";
import { loadEnv } from "@/env";

loadEnv();

if (process.env.PAYMENT_MODE === "real") {
  throw new Error("PAYMENT_MODE=real is not supported until Circle/Arc proof verification is implemented");
}

initializeDatabase();
seedDatabase();

const port = Number(process.env.BACKEND_PORT ?? 4000);
const host = process.env.BACKEND_HOST ?? "0.0.0.0";

createMecenasServer().listen(port, host, () => {
  console.log(`Mecenas backend listening on http://localhost:${port}`);
});
