import { json, notFound } from "@/lib/api/json";
import { findSource } from "@/lib/db/store";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const source = await findSource(id);
  if (!source) return notFound("Source not found");
  return json({ source });
}
