import { getPostLikersPage } from "@/lib/db/personality-activity";
import { getPersonalitiesByIds } from "@/lib/personalities";
import type { ProfileFollower } from "@/lib/types/profile";

export async function buildPostLikers(
  postId: string,
  limit: number,
  offset: number,
): Promise<{ likers: ProfileFollower[]; hasMore: boolean }> {
  const likerRows = await getPostLikersPage(postId, limit + 1, offset);
  const hasMore = likerRows.length > limit;
  const page = hasMore ? likerRows.slice(0, limit) : likerRows;
  const personalities = await getPersonalitiesByIds(
    page.map((row) => row.personalityId),
  );
  const personalitiesById = new Map(
    personalities.map((personality) => [personality.id, personality]),
  );

  const likers = page.flatMap((row) => {
    const personality = personalitiesById.get(row.personalityId);

    if (!personality) {
      return [];
    }

    return [
      {
        id: personality.id,
        name: personality.name,
        handle: personality.handle,
        avatarUrl: personality.avatarUrl,
      },
    ];
  });

  return { likers, hasMore };
}
