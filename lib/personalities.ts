import { Collection } from "mongodb";

import { getDb } from "./mongodb";
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
import type { AvatarStatus, DescriptionStatus, Personality } from "./types/personality";

const COLLECTION = "personalities";

let archetypeMigrationDone = false;

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
  return collection.findOne({ handle });
}

export async function getAllPersonalities(): Promise<Personality[]> {
  const collection = await getPersonalitiesCollection();
  return collection.find().toArray();
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
  return result ?? null;
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
  await migrateInvalidPersonalityArchetypes();
}
