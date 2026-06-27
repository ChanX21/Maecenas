import { ResearchPromptBox } from "@/components/research-prompt-box";
import { SectionHeading } from "@/components/ui/section-heading";

export default function AskPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Research workspace"
        title="Ask a focused question."
        copy="Maecenas searches approved evidence, applies the funded budget, and returns a grounded answer with citations."
      />
      <div className="mt-8">
        <ResearchPromptBox />
      </div>
    </main>
  );
}
