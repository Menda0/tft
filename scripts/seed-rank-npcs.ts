import "./load-env";

async function main(): Promise<void> {
  const {
    abortRankNpcSeed,
    completeRankNpcSeed,
    tryBeginRankNpcSeed,
  } = await import("@/lib/rank-npcs/seed-cooldown");
  const { seedRankNpcsFromConfig } = await import("@/lib/rank-npcs/seed");

  const begin = await tryBeginRankNpcSeed();

  if (!begin.canRun) {
    console.error(
      begin.inProgress
        ? "Rank NPC seed is already running."
        : `Rank NPC seed already ran recently. Next available at ${begin.nextAvailableAt?.toISOString() ?? "unknown"}.`,
    );
    process.exit(1);
  }

  let seedSucceeded = false;

  try {
    const result = await seedRankNpcsFromConfig();
    seedSucceeded = true;

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
  } finally {
    if (seedSucceeded) {
      await completeRankNpcSeed();
    } else {
      await abortRankNpcSeed();
    }
  }
}

main().catch((error) => {
  console.error("Rank NPC seed failed:", error);
  process.exit(1);
});
