import "./load-env";

async function main(): Promise<void> {
  const {
    defaultBootstrapPlayerLog,
    seedBootstrapPlayers,
  } = await import("@/lib/personalities/seed-bootstrap-players");
  const { waitForBootstrapAssetJobs } = await import(
    "@/lib/personalities/bootstrap-assets"
  );

  const result = await seedBootstrapPlayers(defaultBootstrapPlayerLog);

  if (result.assets.biosQueued > 0 || result.assets.avatarsQueued > 0) {
    console.info(
      `[bootstrap] Waiting for ${result.assets.biosQueued} bio job(s) and ${result.assets.avatarsQueued} avatar job(s)...`,
    );
    await waitForBootstrapAssetJobs();
  }

  console.info("Bootstrap players summary:", {
    usersCreated: result.usersCreated,
    usersReused: result.usersReused,
    personalitiesCreated: result.personalitiesCreated,
    assets: result.assets,
    users: result.users.map((user) => ({
      username: user.username,
      created: user.created,
      personalitiesAdded: user.personalitiesAdded,
    })),
  });
}

main().catch((error) => {
  console.error("Bootstrap player seed failed:", error);
  process.exit(1);
});
