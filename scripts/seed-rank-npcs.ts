import { seedRankNpcsFromConfig } from "@/lib/rank-npcs/seed";

async function main(): Promise<void> {
  const result = await seedRankNpcsFromConfig();

  console.info("Rank NPC reconcile:", result.reconcile);
  console.info("Rank NPC sync:", {
    synced: result.sync.synced,
    newPosts: result.sync.newPosts,
    errors: result.sync.errors,
  });
}

main().catch((error) => {
  console.error("Rank NPC seed failed:", error);
  process.exit(1);
});
