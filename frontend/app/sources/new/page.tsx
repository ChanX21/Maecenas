import { SourceRegistrationForm } from "@/components/source-registration-form";
import { SectionHeading } from "@/components/ui/section-heading";

export default function NewSourcePage() {
  return (
    <main className="home-grid min-h-[calc(100vh-65px)] px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Contributor portal"
        title="Put your evidence to work."
        copy="Connect your wallet, publish the source record, and set an unlock price. Once approved, your research can earn funding from every commission it strengthens."
      />
      <div className="mx-auto mt-10 max-w-6xl">
        <SourceRegistrationForm />
      </div>
    </main>
  );
}
