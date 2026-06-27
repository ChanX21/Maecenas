import { LeaderboardStats } from "@/components/leaderboard-stats";
import { RecentPaymentsFeed } from "@/components/recent-payments-feed";
import { SectionHeading } from "@/components/ui/section-heading";
import { getLeaderboard } from "@/api";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Public traction dashboard"
        title="Live Maecenas payment activity."
        copy="A public ledger for registered sources, paid evidence unlocks, source-owner earnings, and recent citation payments."
      />
      <div className="mt-8">
        <LeaderboardStats metrics={leaderboard.metrics} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="roman-panel p-5">
          <h2 className="font-display text-3xl text-cream">Top Earning Sources</h2>
          <div className="mt-5 space-y-3">
            {leaderboard.topEarningSources.map((source) => (
              <div key={source.sourceId} className="border border-marble/10 bg-ink-2 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl text-cream">{source.title}</h3>
                    <p className="mt-1 font-mono text-xs uppercase text-muted">{source.authorName}</p>
                  </div>
                  <p className="font-mono text-sm text-gold">{source.earnedUSDC} USDC</p>
                </div>
                <p className="mt-3 font-mono text-xs uppercase text-dim">{source.citations} paid citations</p>
              </div>
            ))}
          </div>
        </section>
        <RecentPaymentsFeed receipts={leaderboard.recentPaymentStream} />
      </div>
    </main>
  );
}
