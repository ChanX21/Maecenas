import { ResearchPromptBox } from "@/components/research-prompt-box";
import { SectionHeading } from "@/components/ui/section-heading";

export default function AskPage() {
  return (
    <main className="home-grid min-h-[calc(100vh-65px)] px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="The research forum"
        title="Commission your next answer."
        copy="Set the mandate and treasury limit. Maecenas finds the strongest approved evidence and returns a cited brief."
      />
      <div className="mx-auto mt-10 max-w-5xl">
        <ResearchPromptBox />
      </div>
    </main>
  );
}
