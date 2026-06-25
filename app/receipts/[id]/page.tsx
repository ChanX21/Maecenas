import { notFound } from "next/navigation";
import { PaymentReceiptCard } from "@/frontend/components/payment-receipt-card";
import { SectionHeading } from "@/frontend/components/ui/section-heading";
import { getReceipt } from "@/frontend/api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReceiptPage({ params }: PageProps) {
  const { id } = await params;
  const { receipt } = await getReceipt(id).catch(() => ({ receipt: null }));
  if (!receipt) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Public receipt"
        title="Paid Citation Receipt"
        copy="A source owner earned because Mecenas decided this evidence was worth buying before citation."
      />
      <div className="mt-8">
        <PaymentReceiptCard receipt={receipt} />
      </div>
      <div className="roman-panel mt-6 p-5">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Question</p>
        <p className="mt-3 text-lg leading-7 text-cream">{receipt.userPrompt}</p>
      </div>
    </main>
  );
}
