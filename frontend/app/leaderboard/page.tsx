import { LeaderboardStats } from "@/components/leaderboard-stats";
import { LedgerAutoRefresh } from "@/components/ledger-auto-refresh";
import { RecentPaymentsFeed } from "@/components/recent-payments-feed";
import { SectionHeading } from "@/components/ui/section-heading";
import { getLeaderboard } from "@/api";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return (
    <main className="home-grid min-h-[calc(100vh-65px)] px-4 py-14 sm:px-6 lg:px-8">
      <LedgerAutoRefresh />
      <SectionHeading
        eyebrow="The public ledger"
        title="Capital follows useful evidence."
        copy={
          leaderboard.paymentMode === "real"
            ? "Live Circle Gateway credits from completed research runs. Creators withdraw available balances to their wallets."
            : "Test-mode research activity. No displayed payment represents settled USDC."
        }
      />
      <div className="mx-auto mt-10 max-w-7xl">
        <LeaderboardStats
          metrics={leaderboard.metrics}
          paymentMode={leaderboard.paymentMode}
        />
      </div>
      <div className="mx-auto mt-5 grid max-w-7xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="roman-panel p-5 sm:p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Source performance</p>
          <h2 className="mt-2 font-display text-3xl text-cream">Most-funded evidence</h2>
          <div className="mt-5 divide-y divide-marble/10 border-y border-marble/10">
            {leaderboard.topEarningSources.map((source) => (
              <div key={source.sourceId} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl text-cream">{source.title}</h3>
                    <p className="mt-1 font-mono text-xs uppercase text-muted">{source.authorName}</p>
                  </div>
                  <p className="font-mono text-sm text-gold">{source.earnedUSDC} USDC</p>
                </div>
                <p className="mt-3 font-mono text-xs uppercase text-dim">{source.citations} funded selections</p>
              </div>
            ))}
            {!leaderboard.topEarningSources.length ? <p className="py-8 text-center text-sm text-muted">No funded sources yet.</p> : null}
          </div>
        </section>
        <RecentPaymentsFeed receipts={leaderboard.recentPaymentStream} />
      </div>
    </main>
  );
}
