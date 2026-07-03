import { SourceCard } from "@/components/source-card";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { getSources } from "@/api";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const { sources } = await getSources();

  return (
    <main className="home-grid min-h-[calc(100vh-65px)] px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="The source archive"
        title="Evidence worth funding."
        copy="Explore approved research assets. Protected evidence is funded only when it earns a place in a research commission."
      />
      <div className="mt-7 flex justify-center">
        <ButtonLink href="/sources/new" variant="primary">
          Publish evidence
        </ButtonLink>
      </div>
      <div className="mx-auto mt-10 grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sources.map((source) => (
          <div key={source.id} id={source.id}>
            <SourceCard source={source} />
          </div>
        ))}
        {!sources.length ? (
          <div className="roman-panel p-10 text-center md:col-span-2 xl:col-span-3">
            <p className="text-sm text-muted">The archive is waiting for its first approved source.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
