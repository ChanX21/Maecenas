import { resetDbWithSeeds } from "@/db/store";

async function main() {
  const db = await resetDbWithSeeds();
  console.log(`Seeded ${db.sources.length} sources into data/db.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
