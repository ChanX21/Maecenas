import { OwnerDashboard } from "@/components/owner-dashboard";
import { SectionHeading } from "@/components/ui/section-heading";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Source owner"
        title="Submissions and evidence receipts."
        copy="Review source status and track the value recorded when Maecenas selects approved evidence."
      />
      <OwnerDashboard />
    </main>
  );
}
