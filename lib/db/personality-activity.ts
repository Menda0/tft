import { randomUUID } from "crypto";

import { Collection } from "mongodb";

import { getDb } from "@/lib/mongodb";
import type {
  PersonalityActivity,
  PersonalityActivityType,
} from "@/lib/types/personality-activity";

const COLLECTION = "personality_activity";

export async function getPersonalityActivityCollection(): Promise<
  Collection<PersonalityActivity>
> {
  const db = await getDb();
  return db.collection<PersonalityActivity>(COLLECTION);
}

export async function ensurePersonalityActivityIndexes(): Promise<void> {
  const collection = await getPersonalityActivityCollection();
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ personalityId: 1, at: -1 });
}

export type RecordActivityInput = {
  personalityId: string;
  type: PersonalityActivityType;
  at?: Date;
  actorPersonalityId?: string;
  targetPersonalityId?: string;
  postId?: string;
  preview?: string;
};

function toActivityDocument(input: RecordActivityInput): PersonalityActivity {
  return {
    id: randomUUID(),
    personalityId: input.personalityId,
    type: input.type,
    at: input.at ?? new Date(),
    ...(input.actorPersonalityId
      ? { actorPersonalityId: input.actorPersonalityId }
      : {}),
    ...(input.targetPersonalityId
      ? { targetPersonalityId: input.targetPersonalityId }
      : {}),
    ...(input.postId ? { postId: input.postId } : {}),
    ...(input.preview ? { preview: input.preview } : {}),
  };
}

export async function recordPersonalityActivity(
  input: RecordActivityInput,
): Promise<void> {
  const collection = await getPersonalityActivityCollection();
  await collection.insertOne(toActivityDocument(input));
}

export async function recordPersonalityActivities(
  inputs: RecordActivityInput[],
): Promise<void> {
  if (inputs.length === 0) {
    return;
  }

  const collection = await getPersonalityActivityCollection();
  await collection.insertMany(inputs.map(toActivityDocument));
}

export async function getRecentActivityForPersonalities(
  personalityIds: string[],
  limit = 30,
): Promise<PersonalityActivity[]> {
  if (personalityIds.length === 0) {
    return [];
  }

  const collection = await getPersonalityActivityCollection();
  return collection
    .find({ personalityId: { $in: personalityIds } })
    .sort({ at: -1 })
    .limit(limit)
    .toArray();
}

export async function getActivityPageForPersonalities(
  personalityIds: string[],
  limit: number,
  offset: number,
): Promise<PersonalityActivity[]> {
  if (personalityIds.length === 0) {
    return [];
  }

  const collection = await getPersonalityActivityCollection();
  return collection
    .find({ personalityId: { $in: personalityIds } })
    .sort({ at: -1 })
    .skip(offset)
    .limit(limit)
    .toArray();
}

export async function deleteActivityForPersonalityIds(
  personalityIds: string[],
): Promise<number> {
  if (personalityIds.length === 0) {
    return 0;
  }

  const collection = await getPersonalityActivityCollection();
  const result = await collection.deleteMany({
    personalityId: { $in: personalityIds },
  });

  return result.deletedCount;
}
