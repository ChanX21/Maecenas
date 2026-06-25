import { createMecenasServer } from "@/http";
import { loadEnv } from "@/env";

loadEnv();

const port = Number(process.env.BACKEND_PORT ?? 4000);
const host = process.env.BACKEND_HOST ?? "0.0.0.0";

createMecenasServer().listen(port, host, () => {
  console.log(`Mecenas backend listening on http://localhost:${port}`);
});
