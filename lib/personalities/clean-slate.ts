import { deleteAllFollows } from "@/lib/db/follows";
import { deleteAllPersonalityActivity } from "@/lib/db/personality-activity";
import { deleteAllPostReads } from "@/lib/db/post-reads";
import { deleteAllPosts } from "@/lib/db/posts";
import { deleteAllTickResults } from "@/lib/db/tick-results";
import { resetWorldStateToDefault } from "@/lib/db/world";
import {
  getAllRankNpcs,
  getPersonalitiesCollection,
  normalizePersonality,
  resetActivePersonalitiesSocialState,
  updatePersonality,
} from "@/lib/personalities";
import { loadRankNpcConfig } from "@/lib/rank-npcs/config";
import { defaultStats } from "@/lib/personalities/validation";

export type CleanSlatePersonalitySocialResult = {
  posts: number;
  follows: number;
  postReads: number;
  activities: number;
  tickResults: number;
  personalitiesReset: number;
  npcsReset: number;
  worldReset: boolean;
};

async function resetRankNpcSocialStateFromConfig(): Promise<number> {
  const [config, personalities] = await Promise.all([
    loadRankNpcConfig(),
    getAllRankNpcs(),
  ]);
  const entryByXHandle = new Map(
    config.celebrities.map((entry) => [entry.xHandle.toLowerCase(), entry]),
  );
  const collection = await getPersonalitiesCollection();
  let resetNpcs = 0;

  for (const personality of personalities) {
    const normalized = normalizePersonality(personality);
    const xHandle = normalized.xSync?.xHandle;

    if (!xHandle) {
      continue;
    }

    const entry = entryByXHandle.get(xHandle.toLowerCase());
    const stats = entry
      ? {
          followers: entry.followers,
          socialScore: entry.socialScore,
          controversy: 0,
          creativity: 50,
        }
      : defaultStats();

    await collection.updateOne(
      { id: normalized.id },
      {
        $set: {
          relationships: {},
          memory: [],
          beliefs: {},
          stats,
          xSync: {
            xHandle,
            xUserId: normalized.xSync?.xUserId ?? null,
            realName: normalized.xSync?.realName,
            lastSyncedTweetId: null,
            lastSyncedAt: null,
          },
        },
      },
    );
    resetNpcs += 1;
  }

  return resetNpcs;
}

export async function cleanSlatePersonalitySocialData(): Promise<CleanSlatePersonalitySocialResult> {
  const [posts, follows, postReads, activities, tickResults, personalitiesReset, npcsReset, world] =
    await Promise.all([
      deleteAllPosts(),
      deleteAllFollows(),
      deleteAllPostReads(),
      deleteAllPersonalityActivity(),
      deleteAllTickResults(),
      resetActivePersonalitiesSocialState(),
      resetRankNpcSocialStateFromConfig(),
      resetWorldStateToDefault(),
    ]);

  return {
    posts,
    follows,
    postReads,
    activities,
    tickResults,
    personalitiesReset,
    npcsReset,
    worldReset: world.tickNumber === 0 && world.lastTickAt === null,
  };
}
