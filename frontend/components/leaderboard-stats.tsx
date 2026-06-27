type LeaderboardStatsProps = {
  metrics: Record<string, number | string>;
};

const labels: Record<string, string> = {
  sourcesRegistered: "Sources Registered",
  paidEvidenceUnlocks: "Evidence Unlocks",
  totalTestUSDCDistributed: "Recorded Test USDC",
  sourceOwners: "Active Source Owners",
  researchQuestionsAnswered: "Research Questions Answered"
};

export function LeaderboardStats({ metrics }: LeaderboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Object.entries(metrics).map(([key, value]) => (
        <div key={key} className="roman-panel p-5">
          <p className="font-mono text-[11px] uppercase text-dim">{labels[key] ?? key}</p>
          <p className="mt-4 font-display text-3xl text-gold">{value}</p>
        </div>
      ))}
    </div>
  );
}
