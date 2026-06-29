import { storeAvatarImage } from "@/lib/avatars/store-avatar";
import { mergeNotDeleted } from "@/lib/db/active-filters";
import {
  claimAvatarGeneration,
  claimDescriptionGeneration,
  getPersonalitiesCollection,
  normalizePersonality,
  updatePersonality,
} from "@/lib/personalities";
import { generatePixelAvatar } from "@/lib/openai/avatar";
import { generateProfileDescription } from "@/lib/openai/description";
import { runWithConcurrency } from "@/lib/simulation/utils";
import type { Personality } from "@/lib/types/personality";

export type BootstrapPlayerLog = (message: string) => void;

function getAssetConcurrency(): number {
  const raw = process.env.BOOTSTRAP_ASSET_CONCURRENCY?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 3;
}

let assetJobsPromise: Promise<void> | null = null;

export function waitForBootstrapAssetJobs(): Promise<void> {
  return assetJobsPromise ?? Promise.resolve();
}

function needsDescription(personality: Personality): boolean {
  const normalized = normalizePersonality(personality);

  return (
    normalized.descriptionStatus === "pending" ||
    normalized.descriptionStatus === "failed"
  );
}

function needsAvatar(personality: Personality): boolean {
  const normalized = normalizePersonality(personality);

  return (
    normalized.avatarStatus === "pending" ||
    normalized.avatarStatus === "failed"
  );
}

export async function getBootstrapPersonalitiesNeedingAssets(
  ownerIds: string[],
): Promise<Personality[]> {
  if (ownerIds.length === 0) {
    return [];
  }

  const collection = await getPersonalitiesCollection();
  const personalities = await collection
    .find(
      mergeNotDeleted({
        ownerId: { $in: ownerIds },
        $and: [
          {
            $or: [{ role: { $exists: false } }, { role: "player" as const }],
          },
          {
            $or: [
              { avatarStatus: { $in: ["pending", "failed"] } },
              { descriptionStatus: { $in: ["pending", "failed"] } },
            ],
          },
        ],
      }),
    )
    .toArray();

  return personalities.map(normalizePersonality);
}

async function generateBootstrapDescription(
  personalityId: string,
  log: BootstrapPlayerLog,
): Promise<boolean> {
  const claimed = await claimDescriptionGeneration(personalityId);

  if (!claimed) {
    return false;
  }

  const normalized = normalizePersonality(claimed);
  log(`Generating bio for @${normalized.handle} (${normalized.name})...`);

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

async function generateBootstrapAvatar(
  personalityId: string,
  log: BootstrapPlayerLog,
): Promise<boolean> {
  const claimed = await claimAvatarGeneration(personalityId);

  if (!claimed) {
    return false;
  }

  const normalized = normalizePersonality(claimed);
  log(`Generating avatar for @${normalized.handle} (${normalized.name})...`);

  try {
    const imageDataUrl = await generatePixelAvatar({
      name: normalized.name,
      handle: normalized.handle,
      kind: normalized.kind,
      gender: normalized.gender,
      pronouns: normalized.pronouns,
      archetype: normalized.archetype,
      traits: normalized.traits,
      interests: normalized.interests,
    });

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

async function runBootstrapAssetJobs(
  personalities: Personality[],
  log: BootstrapPlayerLog,
): Promise<{ biosCompleted: number; avatarsCompleted: number }> {
  const descriptionIds = personalities
    .filter(needsDescription)
    .map((personality) => personality.id);
  const avatarIds = personalities
    .filter(needsAvatar)
    .map((personality) => personality.id);
  const concurrency = getAssetConcurrency();

  if (descriptionIds.length === 0 && avatarIds.length === 0) {
    return { biosCompleted: 0, avatarsCompleted: 0 };
  }

  log(
    `Starting ${descriptionIds.length} bio job(s) and ${avatarIds.length} avatar job(s) with concurrency ${concurrency}...`,
  );

  let biosCompleted = 0;
  let avatarsCompleted = 0;

  await Promise.all([
    runWithConcurrency(descriptionIds, concurrency, async (personalityId) => {
      const generated = await generateBootstrapDescription(personalityId, log);

      if (generated) {
        biosCompleted += 1;
      }
    }),
    runWithConcurrency(avatarIds, concurrency, async (personalityId) => {
      const generated = await generateBootstrapAvatar(personalityId, log);

      if (generated) {
        avatarsCompleted += 1;
      }
    }),
  ]);

  log(
    `Asset jobs finished: ${biosCompleted} bio(s), ${avatarsCompleted} avatar(s).`,
  );

  return { biosCompleted, avatarsCompleted };
}

export async function queueBootstrapAssetGeneration(
  personalities: Personality[],
  options: {
    log?: BootstrapPlayerLog;
    awaitCompletion?: boolean;
  } = {},
): Promise<{
  biosQueued: number;
  avatarsQueued: number;
  biosCompleted: number;
  avatarsCompleted: number;
}> {
  const log = options.log ?? (() => {});
  const awaitCompletion = options.awaitCompletion ?? false;
  const biosQueued = personalities.filter(needsDescription).length;
  const avatarsQueued = personalities.filter(needsAvatar).length;

  if (biosQueued === 0 && avatarsQueued === 0) {
    return {
      biosQueued: 0,
      avatarsQueued: 0,
      biosCompleted: 0,
      avatarsCompleted: 0,
    };
  }

  for (const personality of personalities) {
    if (needsDescription(personality)) {
      log(`Queued async bio generation for @${personality.handle}`);
    }

    if (needsAvatar(personality)) {
      log(`Queued async avatar generation for @${personality.handle}`);
    }
  }

  const job = runBootstrapAssetJobs(personalities, log).then(() => undefined);
  assetJobsPromise = (assetJobsPromise ?? Promise.resolve()).then(() => job);

  if (awaitCompletion) {
    const result = await runBootstrapAssetJobs(personalities, log);
    return {
      biosQueued,
      avatarsQueued,
      biosCompleted: result.biosCompleted,
      avatarsCompleted: result.avatarsCompleted,
    };
  }

  void job.catch((error) => {
    console.error("Background bootstrap asset generation failed:", error);
  });

  return {
    biosQueued,
    avatarsQueued,
    biosCompleted: 0,
    avatarsCompleted: 0,
  };
}
