import { storeAvatarImage } from "@/lib/avatars/store-avatar";
import {
  claimAvatarGeneration,
  claimDescriptionGeneration,
  normalizePersonality,
  updatePersonality,
} from "@/lib/personalities";
import { getRankNpcRealName } from "@/lib/personalities/rank-npc";
import { generateRankNpcPixelAvatar } from "@/lib/openai/rank-npc-avatar";
import { generateProfileDescription } from "@/lib/openai/description";
import type { Personality } from "@/lib/types/personality";

import { defaultRankNpcLog, type RankNpcLog } from "./logger";

function getAvatarConcurrency(): number {
  const raw = process.env.RANK_NPC_AVATAR_CONCURRENCY?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 3;
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  let index = 0;

  async function runWorker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      await worker(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => runWorker()),
  );
}

export async function generateRankNpcDescription(
  personalityId: string,
  log: RankNpcLog = defaultRankNpcLog,
): Promise<boolean> {
  const claimed = await claimDescriptionGeneration(personalityId);

  if (!claimed) {
    return false;
  }

  const normalized = normalizePersonality(claimed);
  log(
    `Generating bio for @${normalized.handle} (${normalized.name}, parody of ${getRankNpcRealName(normalized)})...`,
  );

  try {
    const description = await generateProfileDescription({
      name: normalized.name,
      handle: normalized.handle,
      kind: normalized.kind,
      gender: normalized.gender,
      pronouns: normalized.pronouns,
      archetype: normalized.archetype,
      traits: normalized.traits,
      politicalSwing: normalized.politicalSwing,
      interests: normalized.interests,
    });

    await updatePersonality(personalityId, {
      description,
      descriptionStatus: "ready",
    });
    log(`Bio ready for @${normalized.handle}`);
    return true;
  } catch (error) {
    console.error(`Description generation failed for ${normalized.handle}:`, error);
    await updatePersonality(personalityId, {
      descriptionStatus: "failed",
    });
    log(`Bio generation failed for @${normalized.handle}`);
    return false;
  }
}

export async function generateRankNpcAvatar(
  personalityId: string,
  log: RankNpcLog = defaultRankNpcLog,
): Promise<boolean> {
  const claimed = await claimAvatarGeneration(personalityId);

  if (!claimed) {
    return false;
  }

  const normalized = normalizePersonality(claimed);
  const realName = getRankNpcRealName(normalized);

  log(
    `Generating pixel avatar for @${normalized.handle} (${normalized.name}, parody of ${realName})...`,
  );

  try {
    const imageDataUrl = await generateRankNpcPixelAvatar(normalized);
    const avatarUrl = await storeAvatarImage({
      personalityId: normalized.id,
      handle: normalized.handle,
      imageDataUrl,
    });

    await updatePersonality(personalityId, {
      avatarUrl,
      avatarStatus: "ready",
    });
    log(`Avatar ready for @${normalized.handle}`);
    return true;
  } catch (error) {
    console.error(`Avatar generation failed for ${normalized.handle}:`, error);
    await updatePersonality(personalityId, {
      avatarStatus: "failed",
    });
    log(`Avatar generation failed for @${normalized.handle}`);
    return false;
  }
}

export function needsRankNpcDescription(personality: Personality): boolean {
  const normalized = normalizePersonality(personality);
  return (
    normalized.descriptionStatus === "pending" ||
    normalized.descriptionStatus === "failed"
  );
}

export function needsRankNpcAvatar(
  personality: Personality,
  forceRegenerate = false,
): boolean {
  const normalized = normalizePersonality(personality);
  return (
    forceRegenerate ||
    normalized.avatarStatus === "pending" ||
    normalized.avatarStatus === "failed"
  );
}

export async function queueRankNpcAssetGeneration(
  personalities: Personality[],
  options: {
    log?: RankNpcLog;
    forceAvatarRegenerate?: boolean;
    awaitAvatars?: boolean;
  } = {},
): Promise<{ descriptions: number; avatarsQueued: number; avatarsCompleted: number }> {
  const log = options.log ?? defaultRankNpcLog;
  const forceAvatarRegenerate = options.forceAvatarRegenerate ?? false;
  const awaitAvatars = options.awaitAvatars ?? true;
  let descriptions = 0;
  const avatarIds: string[] = [];

  for (const personality of personalities) {
    const normalized = normalizePersonality(personality);

    if (forceAvatarRegenerate) {
      await updatePersonality(normalized.id, { avatarStatus: "pending" });
    }

    if (needsRankNpcDescription(normalized)) {
      const generated = await generateRankNpcDescription(normalized.id, log);

      if (generated) {
        descriptions += 1;
      }
    }

    if (needsRankNpcAvatar(normalized, forceAvatarRegenerate)) {
      avatarIds.push(normalized.id);
      log(`Queued async avatar generation for @${normalized.handle}`);
    }
  }

  if (avatarIds.length === 0) {
    return { descriptions, avatarsQueued: 0, avatarsCompleted: 0 };
  }

  log(
    `Starting ${avatarIds.length} avatar job(s) with concurrency ${getAvatarConcurrency()}...`,
  );

  const avatarJob = async (personalityId: string): Promise<void> => {
    await generateRankNpcAvatar(personalityId, log);
  };

  if (awaitAvatars) {
    await runWithConcurrency(avatarIds, getAvatarConcurrency(), avatarJob);
    log(`Finished ${avatarIds.length} avatar job(s).`);
    return {
      descriptions,
      avatarsQueued: avatarIds.length,
      avatarsCompleted: avatarIds.length,
    };
  }

  void runWithConcurrency(avatarIds, getAvatarConcurrency(), avatarJob)
    .then(() => {
      log(`Finished ${avatarIds.length} background avatar job(s).`);
    })
    .catch((error) => {
      console.error("Background avatar generation failed:", error);
    });

  return {
    descriptions,
    avatarsQueued: avatarIds.length,
    avatarsCompleted: 0,
  };
}
