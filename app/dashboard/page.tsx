import { DashboardEarningsTable } from "@/frontend/components/dashboard-earnings-table";
import { SectionHeading } from "@/frontend/components/ui/section-heading";
import { getDashboard } from "@/frontend/api";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ wallet?: string }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const { wallet = "" } = await searchParams;
  const dashboard = await getDashboard(wallet);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Source owner dashboard"
        title="Track source earnings."
        copy="Enter ?wallet=0x... in the URL to filter this MVP dashboard to a specific owner wallet."
      />
      <form className="mt-8 flex max-w-2xl gap-3" action="/dashboard">
        <input
          name="wallet"
          defaultValue={wallet}
          placeholder="0x owner wallet"
          className="min-w-0 flex-1 border border-white/10 bg-panel px-4 py-3 font-mono text-sm text-cream outline-none focus:border-gold/50"
        />
        <button className="roman-button bg-gold px-5 py-3 font-mono text-xs font-semibold uppercase text-ink">Filter</button>
      </form>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Metric label="Total sources registered" value={String(dashboard.totalSourcesRegistered)} />
        <Metric label="Total citations received" value={String(dashboard.totalCitationsReceived)} />
        <Metric label="Total USDC earned" value={`${dashboard.totalUSDCEarned} USDC`} />
      </div>
      <div className="mt-8">
        <DashboardEarningsTable receipts={dashboard.latestPaidCitations} />
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="roman-panel p-5">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-dim">{label}</p>
      <p className="mt-4 font-display text-3xl text-gold">{value}</p>
    </div>
  );
}
