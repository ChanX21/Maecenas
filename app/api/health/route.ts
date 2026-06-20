import { json } from "@/lib/api/json";

export async function GET() {
  return json({
    ok: true,
    service: "mecenas",
    tagline: "Scholarly agents that pay their sources."
  });
}
