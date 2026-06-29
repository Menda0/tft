import "./load-env";

async function main(): Promise<void> {
  const { pruneAllRankNpcPosts } = await import("@/lib/rank-npcs/prune-posts");
  const result = await pruneAllRankNpcPosts();

  console.info("Rank NPC prune:", result);
}

main().catch((error) => {
  console.error("Rank NPC prune failed:", error);
  process.exit(1);
});
