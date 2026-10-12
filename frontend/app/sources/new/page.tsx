import { SourceRegistrationForm } from "@/components/source-registration-form";
import { SectionHeading } from "@/components/ui/section-heading";

export default function NewSourcePage() {
  return (
    <main className="home-grid min-h-[calc(100vh-65px)] px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Lister portal"
        title="List evidence. Earn when it is used."
        copy="List work you authored, published, or are authorized to distribute. Set the evidence price and payout wallet; once approved, you earn whenever Maecenas purchases it for a research answer."
      />
      <div className="mx-auto mt-10 max-w-6xl">
        <SourceRegistrationForm />
      </div>
    </main>
  );
}
