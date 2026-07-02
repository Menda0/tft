import { Collection, type Document, type Filter } from "mongodb";
import { getAddress } from "viem";

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
import {
  defaultStats,
  normalizeBeliefs,
  normalizeStoredTraits,
} from "./personalities/validation";
import { normalizeStoredStats, normalizeStoredStatsRaw } from "./personalities/stats";
import { isRankNpc } from "./personalities/rank-npc";
import { isCatalogPersonality } from "./personalities/catalog";
import { COMPETITIVE_FILTER } from "./personalities/competitive-filter";
import {
  competitiveMatchStage,
  netCloutAddFieldsStages,
} from "./leaderboards/aggregation";
import type {
  AvatarStatus,
  DescriptionStatus,
  MemoryItem,
  Personality,
  PersonalityNft,
  PersonalityRole,
  Relationship,
  Stats,
  XSyncState,
} from "./types/personality";
import type { SocialRank } from "./scoring/ranks";

const COLLECTION = "personalities";

export { COMPETITIVE_FILTER };

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
  if (role === "rank_npc") {
    return "rank_npc";
  }

  if (role === "catalog") {
    return "catalog";
  }

  return "player";
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

function normalizePersonalityNft(
  nft: PersonalityNft | undefined,
): PersonalityNft | undefined {
  if (!nft || typeof nft !== "object") {
    return undefined;
  }

  if (
    !nft.contractAddress ||
    !nft.tokenId ||
    !nft.metadataUri ||
    !nft.mintTxHash
  ) {
    return undefined;
  }

  return {
    chainId: typeof nft.chainId === "number" ? nft.chainId : 8453,
    contractAddress: nft.contractAddress,
    tokenId: String(nft.tokenId),
    metadataUri: nft.metadataUri,
    mintTxHash: nft.mintTxHash,
    mintedAt:
      nft.mintedAt instanceof Date ? nft.mintedAt : new Date(nft.mintedAt),
  };
}

function normalizeNftOwnerAddress(
  value: string | undefined,
): string | undefined {
  if (!value || typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
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
    beliefs: normalizeBeliefs(personality.beliefs),
    stats: normalizeStoredStatsRaw(personality.stats),
    role: normalizeRole(personality.role),
    rankNpcActive:
      personality.role === "rank_npc"
        ? personality.rankNpcActive !== false
        : undefined,
    xSync: normalizeXSync(personality.xSync),
    fixedSocialRank: normalizeFixedSocialRank(personality.fixedSocialRank),
    deletedAt: normalizeDeletedAt(personality.deletedAt),
    nft: normalizePersonalityNft(personality.nft),
    nftOwnerAddress: normalizeNftOwnerAddress(personality.nftOwnerAddress),
    importedViaNft: personality.importedViaNft === true,
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

  if (isCatalogPersonality(normalized)) {
    return null;
  }

  if (normalized.role === "rank_npc" && normalized.rankNpcActive === false) {
    return null;
  }

  return normalized;
}

export async function findPublicPersonalityRelationshipsByHandle(
  handle: string,
): Promise<Pick<Personality, "id" | "relationships"> | null> {
  const collection = await getPersonalitiesCollection();
  const personality = await collection.findOne(
    mergeNotDeleted({ handle }),
    {
      projection: {
        id: 1,
        relationships: 1,
        role: 1,
        rankNpcActive: 1,
      },
    },
  );

  if (!personality) {
    return null;
  }

  if (personality.role === "rank_npc" && personality.rankNpcActive === false) {
    return null;
  }

  return {
    id: personality.id,
    relationships: normalizeRelationships(personality.relationships),
  };
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

export async function findCatalogPersonalities(): Promise<Personality[]> {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection
    .find(mergeNotDeleted({ role: "catalog" }))
    .sort({ createdAt: -1 })
    .toArray();

  return personalities.map(normalizePersonality);
}

const PLAYER_PERSONALITY_FILTER = mergeNotDeleted({
  $or: [
    { role: { $exists: false } },
    { role: "player" as const },
  ],
});

const UNMINTED_NFT_FILTER: Filter<Document> = {
  $or: [{ nft: { $exists: false } }, { nft: null }],
};

export async function countActivePersonalitiesByOwner(
  ownerId: string,
): Promise<number> {
  const collection = await getPersonalitiesCollection();
  return collection.countDocuments(
    mergeNotDeleted({
      ownerId,
      $and: [
        UNMINTED_NFT_FILTER,
        {
          $or: [
            { role: { $exists: false } },
            { role: "player" as const },
          ],
        },
      ],
    }),
  );
}

function normalizeWalletAddresses(addresses: string[]): string[] {
  return [...new Set(addresses.map((address) => getAddress(address)))];
}

export async function findPersonalitiesForUser(input: {
  userId: string;
  linkedWalletAddresses: string[];
}): Promise<Personality[]> {
  const collection = await getPersonalitiesCollection();
  const walletAddresses = normalizeWalletAddresses(input.linkedWalletAddresses);

  const orFilters: Record<string, unknown>[] = [
    {
      ownerId: input.userId,
      ...UNMINTED_NFT_FILTER,
    },
    {
      ownerId: input.userId,
      importedViaNft: true,
    },
  ];

  if (walletAddresses.length > 0) {
    orFilters.push({
      ownerId: input.userId,
      nft: { $exists: true },
      nftOwnerAddress: { $in: walletAddresses },
    });
  }

  const personalities = await collection
    .find(
      mergeNotDeleted({
        $or: orFilters,
        $and: [
          {
            $or: [
              { role: { $exists: false } },
              { role: "player" as const },
            ],
          },
        ],
      }),
    )
    .sort({ createdAt: -1 })
    .toArray();

  const seen = new Set<string>();
  const unique: Personality[] = [];

  for (const personality of personalities.map(normalizePersonality)) {
    if (seen.has(personality.id)) {
      continue;
    }
    seen.add(personality.id);
    unique.push(personality);
  }

  return unique;
}

export async function findPersonalityByNftTokenId(
  tokenId: string,
): Promise<Personality | null> {
  const collection = await getPersonalitiesCollection();
  const personality = await collection.findOne(
    mergeNotDeleted({ "nft.tokenId": tokenId }),
  );
  return personality ? normalizePersonality(personality) : null;
}

export async function findMintedPersonalitiesForWallets(
  walletAddresses: string[],
): Promise<Personality[]> {
  if (walletAddresses.length === 0) {
    return [];
  }

  const normalized = normalizeWalletAddresses(walletAddresses);
  const collection = await getPersonalitiesCollection();
  const personalities = await collection
    .find(
      mergeNotDeleted({
        nft: { $exists: true },
        nftOwnerAddress: { $in: normalized },
      }),
    )
    .sort({ createdAt: -1 })
    .toArray();

  return personalities.map(normalizePersonality);
}

export async function getActivePlayerPersonalities(): Promise<Personality[]> {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection.find(PLAYER_PERSONALITY_FILTER).toArray();

  return personalities.map(normalizePersonality);
}

export async function resetActivePersonalitiesSocialState(): Promise<number> {
  const collection = await getPersonalitiesCollection();
  const result = await collection.updateMany(PLAYER_PERSONALITY_FILTER, {
    $set: {
      relationships: {},
      memory: [],
      beliefs: {},
      stats: defaultStats(),
    },
  });

  socialScoreLeaderboardCache = null;

  return result.modifiedCount;
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

const SOCIAL_SCORE_LEADERBOARD_TTL_MS = 60_000;

let socialScoreLeaderboardCache:
  | { entries: Array<{ id: string; socialScore: number }>; fetchedAt: number }
  | null = null;

export async function getGlobalSocialScoreLeaderboard(): Promise<
  Array<{ id: string; socialScore: number }>
> {
  const now = Date.now();

  if (
    socialScoreLeaderboardCache &&
    now - socialScoreLeaderboardCache.fetchedAt < SOCIAL_SCORE_LEADERBOARD_TTL_MS
  ) {
    return socialScoreLeaderboardCache.entries;
  }

  const collection = await getPersonalitiesCollection();
  const rows = await collection
    .aggregate<{ id: string; socialScore: number }>([
      competitiveMatchStage(),
      ...netCloutAddFieldsStages(),
      { $sort: { _netClout: -1, id: 1 } },
      { $project: { _id: 0, id: 1, socialScore: "$_netClout" } },
    ])
    .toArray();

  socialScoreLeaderboardCache = { entries: rows, fetchedAt: now };
  return rows;
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

export type PersonalityDisplay = Pick<
  Personality,
  "id" | "name" | "handle" | "avatarUrl"
>;

export async function getPersonalityDisplayByIds(
  ids: string[],
): Promise<PersonalityDisplay[]> {
  if (ids.length === 0) {
    return [];
  }

  const collection = await getPersonalitiesCollection();
  const rows = await collection
    .find(
      mergeNotDeleted({ id: { $in: ids } }),
      { projection: { id: 1, name: 1, handle: 1, avatarUrl: 1 } },
    )
    .toArray();

  return rows.map((personality) => ({
    id: personality.id,
    name: personality.name ?? "Unknown",
    handle: personality.handle ?? "unknown",
    avatarUrl: personality.avatarUrl ?? null,
  }));
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
  await collection.createIndex({ "nft.tokenId": 1 }, { sparse: true });
  await collection.createIndex({ nftOwnerAddress: 1 }, { sparse: true });
  await migrateInvalidPersonalityArchetypes();
}
