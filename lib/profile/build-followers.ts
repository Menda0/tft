import { getFollowersForPersonality } from "@/lib/db/follows";
import { getPersonalitiesByIds } from "@/lib/personalities";
import type { ProfileFollower } from "@/lib/types/profile";

export async function buildProfileFollowers(
  personalityId: string,
  limit = 10,
  offset = 0,
): Promise<{ followers: ProfileFollower[]; hasMore: boolean }> {
  const follows = await getFollowersForPersonality(
    personalityId,
    limit + 1,
    offset,
  );
  const hasMore = follows.length > limit;
  const page = hasMore ? follows.slice(0, limit) : follows;
  const followerIds = page.map((follow) => follow.followerId);
  const personalities = await getPersonalitiesByIds(followerIds);
  const personalitiesById = new Map(
    personalities.map((personality) => [personality.id, personality]),
  );

  const followers = page.flatMap((follow) => {
    const personality = personalitiesById.get(follow.followerId);

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

  return { followers, hasMore };
}
