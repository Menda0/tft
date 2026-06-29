import "./load-env";

async function main(): Promise<void> {
  const { pruneAllPlayerPersonalities } = await import(
    "@/lib/personalities/prune-players"
  );

  const result = await pruneAllPlayerPersonalities();

  console.info("Player personality prune:", result);
}

main().catch((error) => {
  console.error("Player personality prune failed:", error);
  process.exit(1);
});
