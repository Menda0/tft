import { Collection } from "mongodb";

import { getDb } from "./mongodb";
import { mergeNotDeleted } from "./db/active-filters";
import {
  classifyPageKind,
  normalizeStoredPageKind,
} from "./avatars/page-kind";
import { normalizeArchetype } from "./personalities/archetypes";
import { defaultPronounsForGender } from "./personalities/gender";
import {
  coerceArchetypeForPageKind,
  migrateStoredPageKind,
  remapArchetypeForMigration,
} from "./personalities/kind-archetypes";
import {
  normalizePoliticalSwing,
  randomPoliticalSwing,
} from "./personalities/political-swing";
import { normalizeStoredTraits } from "./personalities/validation";
import { normalizeStoredStats, normalizeStoredStatsRaw } from "./personalities/stats";
import { isRankNpc } from "./personalities/rank-npc";
import type {
  AvatarStatus,
  DescriptionStatus,
  MemoryItem,
  Personality,
  PersonalityRole,
  Relationship,
  Stats,
  XSyncState,
} from "./types/personality";
import type { SocialRank } from "./scoring/ranks";

const COLLECTION = "personalities";

let archetypeMigrationDone = false;

function clampImportance(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value)));
}

function normalizeMemory(memory: MemoryItem[] | undefined): MemoryItem[] {
  if (!Array.isArray(memory)) {
    return [];
  }

  return memory.map((item) => ({
    type: item.type,
    text: typeof item.text === "string" ? item.text.trim() : "",
    importance: clampImportance(item.importance),
  })).filter((item) => item.text.length > 0);
}

function normalizeRelationships(
  relationships: Record<string, Relationship> | undefined,
): Record<string, Relationship> {
  if (!relationships || typeof relationships !== "object") {
    return {};
  }

  return relationships;
}

function normalizeDeletedAt(value: Date | string | null | undefined): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

export function isPersonalityDeleted(personality: Personality): boolean {
  return normalizeDeletedAt(personality.deletedAt) !== null;
}

export function isActivePlayerPersonality(personality: Personality): boolean {
  return normalizeRole(personality.role) === "player" && !isPersonalityDeleted(personality);
}

function normalizeRole(role: PersonalityRole | string | undefined): PersonalityRole {
  return role === "rank_npc" ? "rank_npc" : "player";
}

function normalizeXSync(
  xSync: XSyncState | undefined,
): XSyncState | undefined {
  if (!xSync || typeof xSync.xHandle !== "string") {
    return undefined;
  }

  const xHandle = xSync.xHandle.trim().replace(/^@+/, "").toLowerCase();

  if (!xHandle) {
    return undefined;
  }

  return {
    xHandle,
    xUserId:
      typeof xSync.xUserId === "string" && xSync.xUserId.trim()
        ? xSync.xUserId.trim()
        : null,
    realName:
      typeof xSync.realName === "string" && xSync.realName.trim()
        ? xSync.realName.trim()
        : undefined,
    lastSyncedTweetId:
      typeof xSync.lastSyncedTweetId === "string"
        ? xSync.lastSyncedTweetId
        : null,
    lastSyncedAt:
      xSync.lastSyncedAt instanceof Date
        ? xSync.lastSyncedAt
        : xSync.lastSyncedAt
          ? new Date(xSync.lastSyncedAt)
          : null,
  };
}

function normalizeFixedSocialRank(
  value: SocialRank | string | undefined,
): SocialRank | undefined {
  if (value === "icon" || value === "celebrity") {
    return value;
  }

  return undefined;
}

export function normalizePersonality(
  personality: Personality,
): Personality {
  const avatarStatus: AvatarStatus =
    personality.avatarStatus ??
    (personality.avatarUrl ? "ready" : "pending");
  const descriptionStatus: DescriptionStatus =
    personality.descriptionStatus ??
    (personality.description ? "ready" : "pending");

  const kind =
    normalizeStoredPageKind(personality.kind as string) ??
    migrateStoredPageKind(personality.kind as string) ??
    classifyPageKind({
      name: personality.name,
      handle: personality.handle,
      archetype:
        normalizeArchetype(personality.archetype as string) ??
        (personality.archetype as Personality["archetype"]),
    });

  const normalizedArchetype =
    personality.archetype === null || personality.archetype === undefined
      ? null
      : normalizeArchetype(personality.archetype as string);

  return {
    ...personality,
    avatarUrl: personality.avatarUrl ?? null,
    avatarStatus,
    description: personality.description ?? null,
    descriptionStatus,
    archetype: coerceArchetypeForPageKind(
      kind,
      normalizedArchetype ?? remapArchetypeForMigration(kind, normalizedArchetype),
    ),
    traits: normalizeStoredTraits(personality.traits),
    politicalSwing:
      normalizePoliticalSwing(personality.politicalSwing) ?? randomPoliticalSwing(),
    kind,
    pronouns:
      personality.pronouns ?? defaultPronounsForGender(personality.gender),
    memory: normalizeMemory(personality.memory),
    relationships: normalizeRelationships(personality.relationships),
    beliefs:
      personality.beliefs && typeof personality.beliefs === "object"
        ? personality.beliefs
        : {},
    stats: normalizeStoredStatsRaw(personality.stats),
    role: normalizeRole(personality.role),
    rankNpcActive:
      personality.role === "rank_npc"
        ? personality.rankNpcActive !== false
        : undefined,
    xSync: normalizeXSync(personality.xSync),
    fixedSocialRank: normalizeFixedSocialRank(personality.fixedSocialRank),
    deletedAt: normalizeDeletedAt(personality.deletedAt),
  };
}

export async function getPersonalitiesCollection(): Promise<
  Collection<Personality>
> {
  const db = await getDb();
  return db.collection<Personality>(COLLECTION);
}

export async function getPersonalityById(
  id: string,
): Promise<Personality | null> {
  const collection = await getPersonalitiesCollection();
  return collection.findOne({ id });
}

export async function findPersonalityByHandle(
  handle: string,
): Promise<Personality | null> {
  const collection = await getPersonalitiesCollection();
  const personality = await collection.findOne(
    mergeNotDeleted({ handle }),
  );

  return personality ? normalizePersonality(personality) : null;
}

export async function findPersonalityByHandleIncludingDeleted(
  handle: string,
): Promise<Personality | null> {
  const collection = await getPersonalitiesCollection();
  const personality = await collection.findOne({ handle });

  return personality ? normalizePersonality(personality) : null;
}

export async function findPublicPersonalityByHandle(
  handle: string,
): Promise<Personality | null> {
  const personality = await findPersonalityByHandleIncludingDeleted(handle);

  if (!personality) {
    return null;
  }

  const normalized = normalizePersonality(personality);

  if (normalized.role === "rank_npc" && normalized.rankNpcActive === false) {
    return null;
  }

  return normalized;
}

export async function findRankNpcByXHandle(
  xHandle: string,
): Promise<Personality | null> {
  const collection = await getPersonalitiesCollection();
  const normalizedHandle = xHandle.trim().replace(/^@+/, "").toLowerCase();
  const personality = await collection.findOne({
    role: "rank_npc",
    "xSync.xHandle": normalizedHandle,
  });

  return personality ? normalizePersonality(personality) : null;
}

export async function getActiveRankNpcs(): Promise<Personality[]> {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection
    .find({
      role: "rank_npc",
      rankNpcActive: { $ne: false },
    })
    .toArray();

  return personalities.map(normalizePersonality);
}

export async function getAllRankNpcs(): Promise<Personality[]> {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection.find({ role: "rank_npc" }).toArray();
  return personalities.map(normalizePersonality);
}

const COMPETITIVE_FILTER = mergeNotDeleted({
  $or: [
    { role: { $exists: false } },
    { role: { $ne: "rank_npc" as const } },
  ],
});

const PLAYER_PERSONALITY_FILTER = mergeNotDeleted({
  $or: [
    { role: { $exists: false } },
    { role: "player" as const },
  ],
});

export async function countActivePersonalitiesByOwner(
  ownerId: string,
): Promise<number> {
  const collection = await getPersonalitiesCollection();
  return collection.countDocuments(
    mergeNotDeleted({
      ownerId,
      $or: [
        { role: { $exists: false } },
        { role: "player" as const },
      ],
    }),
  );
}

export async function getActivePlayerPersonalities(): Promise<Personality[]> {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection.find(PLAYER_PERSONALITY_FILTER).toArray();

  return personalities.map(normalizePersonality);
}

export async function softDeletePersonalities(
  personalityIds: string[],
  deletedAt = new Date(),
): Promise<number> {
  if (personalityIds.length === 0) {
    return 0;
  }

  const collection = await getPersonalitiesCollection();
  const result = await collection.updateMany(
    mergeNotDeleted({ id: { $in: personalityIds } }),
    { $set: { deletedAt } },
  );

  return result.modifiedCount;
}

export async function getAllPersonalities(): Promise<Personality[]> {
  const collection = await getPersonalitiesCollection();
  return collection.find().toArray();
}

export async function getPersonalityCount(): Promise<number> {
  const collection = await getPersonalitiesCollection();
  return collection.countDocuments();
}

export async function getActivePersonalityCount(): Promise<number> {
  const collection = await getPersonalitiesCollection();
  return collection.countDocuments(mergeNotDeleted({}));
}

export async function getCompetitivePersonalityCount(): Promise<number> {
  const collection = await getPersonalitiesCollection();
  return collection.countDocuments(COMPETITIVE_FILTER);
}

export async function getGlobalSocialScoreLeaderboard(): Promise<
  Array<{ id: string; socialScore: number }>
> {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection
    .find(COMPETITIVE_FILTER, { projection: { id: 1, stats: 1 } })
    .toArray();

  return personalities
    .map((personality) => ({
      id: personality.id,
      socialScore: normalizeStoredStats(personality.stats).socialScore,
    }))
    .sort((a, b) => {
      if (b.socialScore !== a.socialScore) {
        return b.socialScore - a.socialScore;
      }

      return a.id.localeCompare(b.id);
    });
}

export async function getSocialScoreGlobalRank(
  personalityId: string,
): Promise<number> {
  const leaderboard = await getGlobalSocialScoreLeaderboard();
  const index = leaderboard.findIndex((entry) => entry.id === personalityId);

  if (index === -1) {
    return leaderboard.length + 1;
  }

  return index + 1;
}

export async function getPersonalitiesByIds(
  ids: string[],
): Promise<Personality[]> {
  if (ids.length === 0) {
    return [];
  }

  const collection = await getPersonalitiesCollection();
  return collection.find({ id: { $in: ids } }).toArray();
}

export async function insertPersonality(
  personality: Personality,
): Promise<Personality> {
  const collection = await getPersonalitiesCollection();
  await collection.insertOne(personality);
  return personality;
}

export async function claimAvatarGeneration(
  id: string,
): Promise<Personality | null> {
  const collection = await getPersonalitiesCollection();
  const result = await collection.findOneAndUpdate(
    {
      id,
      $or: [
        { avatarStatus: { $in: ["pending", "failed"] } },
        {
          avatarStatus: { $exists: false },
          $or: [{ avatarUrl: null }, { avatarUrl: { $exists: false } }],
        },
      ],
    },
    { $set: { avatarStatus: "generating" } },
    { returnDocument: "after" },
  );

  return result ? normalizePersonality(result) : null;
}

export async function claimDescriptionGeneration(
  id: string,
): Promise<Personality | null> {
  const collection = await getPersonalitiesCollection();
  const result = await collection.findOneAndUpdate(
    {
      id,
      $or: [
        { descriptionStatus: { $in: ["pending", "failed"] } },
        {
          descriptionStatus: { $exists: false },
          $or: [
            { description: null },
            { description: { $exists: false } },
          ],
        },
      ],
    },
    { $set: { descriptionStatus: "generating" } },
    { returnDocument: "after" },
  );

  return result ? normalizePersonality(result) : null;
}

export async function updatePersonality(
  id: string,
  updates: Partial<Omit<Personality, "id">>,
): Promise<Personality | null> {
  const collection = await getPersonalitiesCollection();
  const result = await collection.findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: "after" },
  );
  return result ? normalizePersonality(result) : null;
}

export async function updatePersonalityStats(
  id: string,
  patch: Partial<Stats>,
): Promise<Personality | null> {
  if (Object.keys(patch).length === 0) {
    return getPersonalityById(id).then((personality) =>
      personality ? normalizePersonality(personality) : null,
    );
  }

  const collection = await getPersonalitiesCollection();
  const setFields = Object.fromEntries(
    Object.entries(patch).map(([key, value]) => [`stats.${key}`, value]),
  );
  const result = await collection.findOneAndUpdate(
    { id },
    { $set: setFields },
    { returnDocument: "after" },
  );
  return result ? normalizePersonality(result) : null;
}

export async function deletePersonality(id: string): Promise<boolean> {
  const collection = await getPersonalitiesCollection();
  const result = await collection.deleteOne({ id });
  return result.deletedCount === 1;
}

async function migrateInvalidPersonalityArchetypes(): Promise<void> {
  if (archetypeMigrationDone) {
    return;
  }

  archetypeMigrationDone = true;

  const collection = await getPersonalitiesCollection();
  const personalities = await collection.find().toArray();
  let updated = 0;

  for (const personality of personalities) {
    const normalized = normalizePersonality(personality);
    const updates: Partial<Personality> = {};

    if (normalized.kind !== personality.kind) {
      updates.kind = normalized.kind;
    }

    if (normalized.archetype !== personality.archetype) {
      updates.archetype = normalized.archetype;
    }

    if (Object.keys(updates).length > 0) {
      await collection.updateOne({ id: personality.id }, { $set: updates });
      updated += 1;
    }
  }

  if (updated > 0) {
    console.info(`Migrated ${updated} personalities to valid kind/archetype pairs.`);
  }
}

export async function ensurePersonalityIndexes(): Promise<void> {
  const collection = await getPersonalitiesCollection();
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ handle: 1 }, { unique: true });
  await collection.createIndex({ archetype: 1 });
  await collection.createIndex({ ownerId: 1 });
  await collection.createIndex({ "stats.socialScore": -1 });
  await collection.createIndex({ "stats.controversy": -1 });
  await collection.createIndex({ role: 1 });
  await collection.createIndex({ "xSync.xHandle": 1 });
  await collection.createIndex({ deletedAt: 1 });
  await migrateInvalidPersonalityArchetypes();
}
