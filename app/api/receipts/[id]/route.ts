import { json, notFound } from "@/lib/api/json";
import { findReceipt } from "@/lib/db/store";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const receipt = await findReceipt(id);
  if (!receipt) return notFound("Receipt not found");
  return json({ receipt });
}
