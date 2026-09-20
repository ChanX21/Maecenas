import Link from "next/link";
import { redirect } from "next/navigation";
import { SourceCard } from "@/components/source-card";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { getSources } from "@/api";

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function SourcesPage({ searchParams }: PageProps) {
  const rawPage = (await searchParams).page;
  const value = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const page = value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Math.max(1, Number(value)) : 1;
  const { items: sources, pagination } = await getSources({ page });
  if (pagination.totalPages > 0 && page > pagination.totalPages) redirect(`/sources?page=${pagination.totalPages}`);

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
      {pagination.totalItems > 0 ? (
        <nav aria-label="Source archive pages" className="mx-auto mt-8 flex max-w-7xl items-center justify-center gap-4 font-mono text-xs">
          {pagination.hasPreviousPage ? (
            <Link href={`/sources?page=${pagination.page - 1}`} className="roman-button px-4 py-2 text-gold hover:text-cream">
              Previous
            </Link>
          ) : (
            <span aria-disabled="true" className="roman-button cursor-not-allowed px-4 py-2 text-dim opacity-50">Previous</span>
          )}
          <span className="text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          {pagination.hasNextPage ? (
            <Link href={`/sources?page=${pagination.page + 1}`} className="roman-button px-4 py-2 text-gold hover:text-cream">
              Next
            </Link>
          ) : (
            <span aria-disabled="true" className="roman-button cursor-not-allowed px-4 py-2 text-dim opacity-50">Next</span>
          )}
        </nav>
      ) : null}
    </main>
  );
}
