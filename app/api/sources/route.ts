import { badRequest, json } from "@/lib/api/json";
import { createSource, listSources } from "@/lib/db/store";
import type { Source } from "@/lib/types";
import { makeId } from "@/lib/utils/ids";

export async function GET() {
  return json({ sources: await listSources() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const required = ["title", "authorName", "sourceUrl", "walletAddress", "citationPriceUSDC", "abstract", "evidenceText"];
  const missing = required.filter((field) => !body[field]);
  if (missing.length > 0) {
    return badRequest(`Missing required fields: ${missing.join(", ")}`);
  }

  const source: Source = {
    id: makeId("src"),
    title: String(body.title),
    authorName: String(body.authorName),
    sourceUrl: String(body.sourceUrl),
    doiOrCanonicalUrl: body.doiOrCanonicalUrl ? String(body.doiOrCanonicalUrl) : undefined,
    walletAddress: String(body.walletAddress),
    citationPriceUSDC: String(body.citationPriceUSDC),
    abstract: String(body.abstract),
    evidenceText: String(body.evidenceText),
    tags: String(body.tags ?? "")
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
    license: body.license ? String(body.license) : undefined,
    createdAt: new Date().toISOString()
  };

  return json({ source: await createSource(source) }, 201);
}
