import { deleteFollowsForPersonalityIds } from "@/lib/db/follows";
import { deletePostReadsForPersonalityIds } from "@/lib/db/post-reads";
import { softDeletePostsByPersonalityIds } from "@/lib/db/posts";
import {
  getActivePlayerPersonalities,
  softDeletePersonalities,
} from "@/lib/personalities";

export type PrunePlayerPersonalitiesResult = {
  personalities: number;
  posts: number;
  follows: number;
  postReads: number;
};

export async function pruneAllPlayerPersonalities(): Promise<PrunePlayerPersonalitiesResult> {
  const personalities = await getActivePlayerPersonalities();
  const personalityIds = personalities.map((personality) => personality.id);

  if (personalityIds.length === 0) {
    return {
      personalities: 0,
      posts: 0,
      follows: 0,
      postReads: 0,
    };
  }

  const deletedAt = new Date();
  const [personalitiesDeleted, postsDeleted, followsDeleted, postReadsDeleted] =
    await Promise.all([
      softDeletePersonalities(personalityIds, deletedAt),
      softDeletePostsByPersonalityIds(personalityIds, deletedAt),
      deleteFollowsForPersonalityIds(personalityIds),
      deletePostReadsForPersonalityIds(personalityIds),
    ]);

  return {
    personalities: personalitiesDeleted,
    posts: postsDeleted,
    follows: followsDeleted,
    postReads: postReadsDeleted,
  };
}
