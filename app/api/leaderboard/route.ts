import { json } from "@/lib/api/json";
import { readDb } from "@/lib/db/store";
import { sumUSDC } from "@/lib/utils/money";

export async function GET() {
  const db = await readDb();
  const owners = new Set(db.sources.map((source) => source.walletAddress.toLowerCase()));
  const topEarningSources = db.sources
    .map((source) => {
      const receipts = db.receipts.filter((receipt) => receipt.sourceId === source.id);
      return {
        sourceId: source.id,
        title: source.title,
        authorName: source.authorName,
        citations: receipts.length,
        earnedUSDC: sumUSDC(receipts.map((receipt) => receipt.amountUSDC))
      };
    })
    .sort((a, b) => Number(b.earnedUSDC) - Number(a.earnedUSDC))
    .slice(0, 8);

  return json({
    metrics: {
      sourcesRegistered: db.sources.length,
      sourceOwners: owners.size,
      researchQuestionsAnswered: db.answers.length,
      paidEvidenceUnlocks: db.receipts.length,
      totalTestUSDCDistributed: sumUSDC(db.receipts.map((receipt) => receipt.amountUSDC))
    },
    topEarningSources,
    recentPaymentStream: db.receipts.slice(0, 12)
  });
}
