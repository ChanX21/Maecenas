import { SourceCard } from "@/components/source-card";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { getSources } from "@/api";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const { sources } = await getSources();

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <SectionHeading
          eyebrow="Public source registry"
          title="Approved evidence sources."
          copy="Public metadata is searchable. Protected evidence is unlocked only when selected for a funded research answer."
        />
        <ButtonLink href="/sources/new" variant="primary">
          Register a Source
        </ButtonLink>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {sources.map((source) => (
          <div key={source.id} id={source.id}>
            <SourceCard source={source} />
          </div>
        ))}
      </div>
    </main>
  );
}
