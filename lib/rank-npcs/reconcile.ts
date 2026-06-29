import { profileKindUsesIdentity } from "@/lib/avatars/page-kind";
import { deletePostsByPersonality } from "@/lib/db/posts";
import {
  deletePersonality,
  ensurePersonalityIndexes,
  findPersonalityByHandle,
  findRankNpcByXHandle,
  getAllRankNpcs,
  insertPersonality,
  normalizePersonality,
  updatePersonality,
} from "@/lib/personalities";
import { defaultPronounsForGender } from "@/lib/personalities/gender";
import { createPersonalityId, normalizeStoredTraits } from "@/lib/personalities/validation";
import type { RankNpcConfig, RankNpcConfigEntry } from "@/lib/rank-npcs/config";
import { defaultRankNpcLog, type RankNpcLog } from "@/lib/rank-npcs/logger";
import { ensureSystemUser } from "@/lib/system/owner";
import type { Personality } from "@/lib/types/personality";

export type ReconcileResult = {
  created: string[];
  updated: string[];
  deactivated: string[];
  deleted: string[];
};

function defaultGenderForKind(
  kind: RankNpcConfigEntry["kind"],
): Personality["gender"] {
  return profileKindUsesIdentity(kind) ? "prefer_not_to_say" : "door";
}

function buildPersonalityFromEntry(
  entry: RankNpcConfigEntry,
  ownerId: string,
): Personality {
  const gender = defaultGenderForKind(entry.kind);

  return normalizePersonality({
    id: createPersonalityId(),
    name: entry.name,
    handle: entry.handle,
    kind: entry.kind,
    gender,
    pronouns: defaultPronounsForGender(gender),
    avatarUrl: null,
    avatarStatus: "pending",
    description: null,
    descriptionStatus: "pending",
    ownerId,
    createdAt: new Date(),
    archetype: entry.archetype,
    traits: normalizeStoredTraits({}),
    politicalSwing: 0,
    interests: [],
    beliefs: {},
    stats: {
      followers: entry.followers,
      socialScore: entry.socialScore,
      controversy: 0,
      creativity: 50,
    },
    memory: [],
    relationships: {},
    role: "rank_npc",
    rankNpcActive: true,
    fixedSocialRank: entry.fixedSocialRank,
    xSync: {
      xHandle: entry.xHandle,
      xUserId: null,
      realName: entry.realName,
      lastSyncedTweetId: null,
      lastSyncedAt: null,
    },
  });
}

async function ensureHandleAvailable(
  handle: string,
  personalityId: string,
): Promise<void> {
  const existing = await findPersonalityByHandle(handle);

  if (existing && existing.id !== personalityId) {
    throw new Error(
      `Knock-off handle "${handle}" is already used by another personality.`,
    );
  }
}

async function upsertRankNpc(
  entry: RankNpcConfigEntry,
  ownerId: string,
  log: RankNpcLog,
): Promise<"created" | "updated"> {
  const existing = await findRankNpcByXHandle(entry.xHandle);

  if (!existing) {
    await ensureHandleAvailable(entry.handle, "");
    await insertPersonality(buildPersonalityFromEntry(entry, ownerId));
    log(
      `Created @${entry.handle} (${entry.name}, parody of ${entry.realName}) — avatar pending`,
    );
    return "created";
  }

  await ensureHandleAvailable(entry.handle, existing.id);

  const xHandleChanged = existing.xSync?.xHandle !== entry.xHandle;
  const realNameChanged = existing.xSync?.realName !== entry.realName;
  const updates: Partial<Personality> = {
    name: entry.name,
    handle: entry.handle,
    kind: entry.kind,
    archetype: entry.archetype,
    fixedSocialRank: entry.fixedSocialRank,
    rankNpcActive: true,
    stats: {
      ...existing.stats,
      followers: entry.followers,
      socialScore: entry.socialScore,
    },
    xSync: {
      xHandle: entry.xHandle,
      xUserId: xHandleChanged ? null : (existing.xSync?.xUserId ?? null),
      realName: entry.realName,
      lastSyncedTweetId: xHandleChanged
        ? null
        : (existing.xSync?.lastSyncedTweetId ?? null),
      lastSyncedAt: xHandleChanged
        ? null
        : (existing.xSync?.lastSyncedAt ?? null),
    },
  };

  if (realNameChanged) {
    updates.avatarStatus = "pending";
    updates.avatarUrl = null;
    log(
      `Updated @${entry.handle} — realName changed, avatar will regenerate async`,
    );
  }

  await updatePersonality(existing.id, updates);

  if (!realNameChanged) {
    log(`Updated @${entry.handle} (${entry.name})`);
  }

  return "updated";
}

async function removeRankNpc(
  personality: Personality,
  onRemove: RankNpcConfig["onRemove"],
  log: RankNpcLog,
): Promise<"deactivated" | "deleted"> {
  const handle = personality.handle;
  const xHandle = personality.xSync?.xHandle ?? handle;

  if (onRemove === "delete") {
    await deletePostsByPersonality(personality.id);
    await deletePersonality(personality.id);
    log(`Deleted rank NPC @${handle} (${xHandle})`);
    return "deleted";
  }

  await updatePersonality(personality.id, { rankNpcActive: false });
  log(`Deactivated rank NPC @${handle} (${xHandle})`);
  return "deactivated";
}

export async function reconcileRankNpcs(
  config: RankNpcConfig,
  log: RankNpcLog = defaultRankNpcLog,
): Promise<ReconcileResult> {
  await ensurePersonalityIndexes();
  const ownerId = await ensureSystemUser();

  const result: ReconcileResult = {
    created: [],
    updated: [],
    deactivated: [],
    deleted: [],
  };

  const configXHandles = new Set(
    config.celebrities.map((entry) => entry.xHandle),
  );

  for (const entry of config.celebrities) {
    const action = await upsertRankNpc(entry, ownerId, log);

    if (action === "created") {
      result.created.push(entry.xHandle);
    } else {
      result.updated.push(entry.xHandle);
    }
  }

  const existingRankNpcs = await getAllRankNpcs();

  for (const personality of existingRankNpcs) {
    const xHandle = personality.xSync?.xHandle;

    if (!xHandle || configXHandles.has(xHandle)) {
      continue;
    }

    const action = await removeRankNpc(personality, config.onRemove, log);

    if (action === "deleted") {
      result.deleted.push(xHandle);
    } else {
      result.deactivated.push(xHandle);
    }
  }

  return result;
}
