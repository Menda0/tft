import "./load-env";

async function main(): Promise<void> {
  const { seedBootstrapPlayers } = await import(
    "@/lib/personalities/seed-bootstrap-players"
  );

  const result = await seedBootstrapPlayers();

  console.info("Bootstrap players:", result);
}

main().catch((error) => {
  console.error("Bootstrap player seed failed:", error);
  process.exit(1);
});
