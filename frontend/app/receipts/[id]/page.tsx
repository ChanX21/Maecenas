import { notFound } from "next/navigation";
import { PaymentReceiptCard } from "@/components/payment-receipt-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getReceipt } from "@/api";

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
        eyebrow="Evidence ledger"
        title="Evidence purchase receipt"
        copy="This record shows why evidence was selected, who was assigned the value, and whether settlement was mock or real."
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
