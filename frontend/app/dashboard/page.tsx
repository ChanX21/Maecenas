import { OwnerDashboard } from "@/components/owner-dashboard";
import { SectionHeading } from "@/components/ui/section-heading";

export default function DashboardPage() {
  return (
    <main className="home-grid min-h-[calc(100vh-65px)] px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Contributor treasury"
        title="Research in. Funding out."
        copy="Manage submitted evidence, follow review status, and track the value your sources create."
      />
      <div className="mx-auto max-w-6xl">
        <OwnerDashboard />
      </div>
    </main>
  );
}
