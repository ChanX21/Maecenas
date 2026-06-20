import { json } from "@/lib/api/json";
import { resetDbWithSeeds } from "@/lib/db/store";

export async function POST() {
  const db = await resetDbWithSeeds();
  return json({ ok: true, sources: db.sources.length });
}
