import "./load-env";

async function main(): Promise<void> {
  const { cleanSlatePersonalitySocialData } = await import(
    "@/lib/personalities/clean-slate"
  );

  const result = await cleanSlatePersonalitySocialData();

  console.info("Personality social clean slate:", result);
}

main().catch((error) => {
  console.error("Personality social clean slate failed:", error);
  process.exit(1);
});
