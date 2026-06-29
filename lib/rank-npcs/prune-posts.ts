import {
  deleteRepliesToPosts,
  deletePostsByIds,
  getMirroredPostIdsByPersonalityIds,
} from "@/lib/db/posts";
import { getAllRankNpcs, normalizePersonality, updatePersonality } from "@/lib/personalities";

export type PruneRankNpcPostsResult = {
  deletedPosts: number;
  deletedReplies: number;
  resetNpcs: number;
};

export async function pruneAllRankNpcPosts(): Promise<PruneRankNpcPostsResult> {
  const personalities = await getAllRankNpcs();
  const personalityIds = personalities.map((personality) => personality.id);
  const postIds = await getMirroredPostIdsByPersonalityIds(personalityIds);

  const deletedReplies = await deleteRepliesToPosts(postIds);
  const deletedPosts = await deletePostsByIds(postIds);

  let resetNpcs = 0;

  for (const personality of personalities) {
    const normalized = normalizePersonality(personality);
    const xHandle = normalized.xSync?.xHandle;

    if (!xHandle) {
      continue;
    }

    await updatePersonality(normalized.id, {
      xSync: {
        xHandle,
        realName: normalized.xSync?.realName,
        lastSyncedTweetId: null,
        lastSyncedAt: null,
      },
    });
    resetNpcs += 1;
  }

  return {
    deletedPosts,
    deletedReplies,
    resetNpcs,
  };
}
