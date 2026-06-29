import "./load-env";

async function main(): Promise<void> {
  const { seedRankNpcsFromConfig } = await import("@/lib/rank-npcs/seed");
  const result = await seedRankNpcsFromConfig();

  console.info("Rank NPC reconcile:", result.reconcile);
  console.info("Rank NPC sync:", {
    synced: result.sync.synced,
    newPosts: result.sync.newPosts,
    skipped: result.sync.skipped,
    skipReason: result.sync.skipReason,
    errors: result.sync.errors,
    createdPosts: result.sync.results.flatMap((entry) =>
      entry.createdPosts.map((post) => ({
        handle: entry.knockOffHandle,
        ...post,
      })),
    ),
  });
  console.info("Rank NPC assets:", result.assets);
}

main().catch((error) => {
  console.error("Rank NPC seed failed:", error);
  process.exit(1);
});
