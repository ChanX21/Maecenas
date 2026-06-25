import { SourceRegistrationForm } from "@/components/source-registration-form";
import { SectionHeading } from "@/components/ui/section-heading";

export default function NewSourcePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Source owner console"
        title="Register a scholarly source."
        copy="Set a USDC citation price, owner wallet, free metadata, and protected evidence text for the agent to buy."
      />
      <div className="mt-8">
        <SourceRegistrationForm />
      </div>
    </main>
  );
}
