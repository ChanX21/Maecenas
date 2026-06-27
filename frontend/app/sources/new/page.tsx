import { SourceRegistrationForm } from "@/components/source-registration-form";
import { SectionHeading } from "@/components/ui/section-heading";

export default function NewSourcePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Source owner console"
        title="Submit evidence for review."
        copy="Connect the owner wallet, publish source metadata, and set the price for protected evidence. Approved sources become available to the research agent."
      />
      <div className="mt-8">
        <SourceRegistrationForm />
      </div>
    </main>
  );
}
