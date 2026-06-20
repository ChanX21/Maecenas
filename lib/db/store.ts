import { promises as fs } from "fs";
import path from "path";
import type { Answer, CitationPayment, MecenasDatabase, Source } from "@/lib/types";
import { seedSources } from "@/lib/db/seed-data";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "db.json");

const emptyDb = (): MecenasDatabase => ({
  sources: seedSources,
  answers: [],
  receipts: []
});

async function ensureDatabase(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify(emptyDb(), null, 2));
  }
}

export async function readDb(): Promise<MecenasDatabase> {
  await ensureDatabase();
  const raw = await fs.readFile(dbPath, "utf8");
  return JSON.parse(raw) as MecenasDatabase;
}

export async function writeDb(db: MecenasDatabase): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
}

export async function resetDbWithSeeds(): Promise<MecenasDatabase> {
  const db = emptyDb();
  await writeDb(db);
  return db;
}

export async function listSources(): Promise<Source[]> {
  return (await readDb()).sources;
}

export async function findSource(id: string): Promise<Source | undefined> {
  return (await readDb()).sources.find((source) => source.id === id);
}

export async function createSource(source: Source): Promise<Source> {
  const db = await readDb();
  db.sources.unshift(source);
  await writeDb(db);
  return source;
}

export async function createAnswer(answer: Answer): Promise<Answer> {
  const db = await readDb();
  db.answers.unshift(answer);
  await writeDb(db);
  return answer;
}

export async function findAnswer(id: string): Promise<Answer | undefined> {
  return (await readDb()).answers.find((answer) => answer.id === id);
}

export async function createReceipt(receipt: CitationPayment): Promise<CitationPayment> {
  const db = await readDb();
  db.receipts.unshift(receipt);
  await writeDb(db);
  return receipt;
}

export async function createReceipts(receipts: CitationPayment[]): Promise<CitationPayment[]> {
  const db = await readDb();
  db.receipts.unshift(...receipts);
  await writeDb(db);
  return receipts;
}

export async function findReceipt(id: string): Promise<CitationPayment | undefined> {
  return (await readDb()).receipts.find((receipt) => receipt.id === id);
}
