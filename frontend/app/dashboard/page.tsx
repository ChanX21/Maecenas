import { OwnerDashboard } from "@/components/owner-dashboard";
import { SectionHeading } from "@/components/ui/section-heading";

export default function DashboardPage() {
  return (
    <main className="home-grid min-h-[calc(100vh-65px)] px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Contributor earnings"
        title="Your research can earn."
        copy="Manage your submitted sources, follow approval status, and withdraw earnings to your payout wallet."
      />
      <div className="mx-auto max-w-6xl">
        <OwnerDashboard />
      </div>
    </main>
  );
}
