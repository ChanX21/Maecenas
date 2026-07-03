import { AdminSourceReview } from "@/components/admin-source-review";
import { SectionHeading } from "@/components/ui/section-heading";

export default function AdminPage() {
  return (
    <main className="home-grid min-h-[calc(100vh-65px)] px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Curator access"
        title="Review the archive."
        copy="Approve evidence only after checking provenance, ownership, licensing, and research quality."
      />
      <AdminSourceReview />
    </main>
  );
}
