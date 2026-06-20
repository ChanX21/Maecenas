import { json } from "@/lib/api/json";
import { readDb } from "@/lib/db/store";
import { sumUSDC } from "@/lib/utils/money";

export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get("wallet")?.toLowerCase() ?? "";
  const db = await readDb();
  const sources = db.sources.filter((source) => !wallet || source.walletAddress.toLowerCase() === wallet);
  const sourceIds = new Set(sources.map((source) => source.id));
  const receipts = db.receipts.filter((receipt) => sourceIds.has(receipt.sourceId));
  const topSource = sources
    .map((source) => ({
      source,
      earnedUSDC: sumUSDC(receipts.filter((receipt) => receipt.sourceId === source.id).map((receipt) => receipt.amountUSDC))
    }))
    .sort((a, b) => Number(b.earnedUSDC) - Number(a.earnedUSDC))[0];

  return json({
    wallet,
    totalSourcesRegistered: sources.length,
    totalCitationsReceived: receipts.length,
    totalUSDCEarned: sumUSDC(receipts.map((receipt) => receipt.amountUSDC)),
    latestPaidCitations: receipts.slice(0, 10),
    topEarningSource: topSource ?? null
  });
}
