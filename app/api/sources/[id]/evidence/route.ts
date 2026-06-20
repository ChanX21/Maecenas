import { json, notFound } from "@/lib/api/json";
import { findSource } from "@/lib/db/store";
import { buildPaymentRequired, hasValidPaymentProof } from "@/lib/payments/payment-executor";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const source = await findSource(id);
  if (!source) return notFound("Source not found");

  const proof = request.headers.get("x-payment-proof") ?? new URL(request.url).searchParams.get("proof");
  if (!hasValidPaymentProof(source, proof)) {
    return json(buildPaymentRequired(source), 402);
  }

  return json({
    id: source.id,
    title: source.title,
    authorName: source.authorName,
    evidenceText: source.evidenceText,
    citation: {
      sourceUrl: source.sourceUrl,
      doiOrCanonicalUrl: source.doiOrCanonicalUrl,
      license: source.license
    }
  });
}
