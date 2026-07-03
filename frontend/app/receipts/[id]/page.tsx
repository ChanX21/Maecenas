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
    <main className="home-grid min-h-[calc(100vh-65px)] px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="The treasury ledger"
        title="Proof of patronage."
        copy="See why this evidence earned funding, who receives the value, and whether the settlement is test or live."
      />
      <div className="mx-auto mt-10 max-w-4xl">
        <PaymentReceiptCard receipt={receipt} />
        <div className="roman-panel mt-5 p-5 sm:p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Research mandate</p>
          <p className="mt-3 font-display text-xl leading-8 text-cream sm:text-2xl">{receipt.userPrompt}</p>
        </div>
      </div>
    </main>
  );
}
