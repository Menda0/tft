import { getActiveRankNpcs } from "@/lib/personalities";
import { loadRankNpcConfig } from "@/lib/rank-npcs/config";
import { queueRankNpcAssetGeneration } from "@/lib/rank-npcs/assets";
import { defaultRankNpcLog, type RankNpcLog } from "@/lib/rank-npcs/logger";
import { queuePendingMirroredPostMedia } from "@/lib/rank-npcs/post-media";
import { reconcileRankNpcs } from "@/lib/rank-npcs/reconcile";
import { syncActiveRankNpcs } from "@/lib/x/sync";

export async function seedRankNpcsFromConfig(options?: {
  log?: RankNpcLog;
  awaitAvatars?: boolean;
}): Promise<{
  reconcile: Awaited<ReturnType<typeof reconcileRankNpcs>>;
  sync: Awaited<ReturnType<typeof syncActiveRankNpcs>>;
  assets: Awaited<ReturnType<typeof queueRankNpcAssetGeneration>>;
}> {
  const log = options?.log ?? defaultRankNpcLog;
  const awaitAvatars = options?.awaitAvatars ?? true;

  log("Loading rank NPC config...");
  const config = await loadRankNpcConfig();
  log(`Found ${config.celebrities.length} celebrities in config.`);

  log("Reconciling rank NPC personalities...");
  const reconcile = await reconcileRankNpcs(config, log);

  log("Syncing mirrored posts from X...");
  const sync = await syncActiveRankNpcs({
    initialPostCount: config.initialPostCount,
    log,
  });

  if (sync.skipped) {
    log(`X sync skipped: ${sync.skipReason}`);
  } else {
    log(
      `X sync complete: ${sync.newPosts} new post(s), ${sync.errors.length} error(s).`,
    );
  }

  for (const result of sync.results) {
    if (result.error) {
      continue;
    }

    if (result.createdPosts.length > 0) {
      log(
        `@${result.knockOffHandle}: ${result.createdPosts.length} post(s) created.`,
      );
    }
  }

  const personalities = await getActiveRankNpcs();
  const forceAvatarRegenerate =
    process.env.RANK_NPC_REGENERATE_AVATARS?.trim() === "true";

  if (forceAvatarRegenerate) {
    log("RANK_NPC_REGENERATE_AVATARS=true — avatars will be regenerated.");
  }

  log(`Checking assets for ${personalities.length} active rank NPC(s)...`);
  const assets = await queueRankNpcAssetGeneration(personalities, {
    log,
    forceAvatarRegenerate,
    awaitAvatars,
  });

  log(
    `Asset pass complete: ${assets.descriptions} bio(s) generated, ${assets.avatarsQueued} avatar(s) queued.`,
  );

  const pendingMedia = await queuePendingMirroredPostMedia({ log });
  if (pendingMedia > 0) {
    log(`Queued ${pendingMedia} pending post media job(s).`);
  }

  return { reconcile, sync, assets };
}
