import { ResearchPromptBox } from "@/components/research-prompt-box";
import { SectionHeading } from "@/components/ui/section-heading";

export default function AskPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Maecenas Scholar Agent"
        title="Ask a question with a research budget."
        copy="The agent plans, searches registered sources, scores evidence, buys selected endpoints, and returns a cited answer with receipts."
      />
      <div className="mt-8">
        <ResearchPromptBox />
      </div>
    </main>
  );
}
