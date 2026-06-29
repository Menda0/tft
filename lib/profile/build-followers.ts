import { getFollowersForPersonality } from "@/lib/db/follows";
import { getPersonalitiesByIds } from "@/lib/personalities";
import type { ProfileFollower } from "@/lib/types/profile";

export async function buildProfileFollowers(
  personalityId: string,
  limit = 100,
): Promise<ProfileFollower[]> {
  const follows = await getFollowersForPersonality(personalityId, limit);
  const followerIds = follows.map((follow) => follow.followerId);
  const personalities = await getPersonalitiesByIds(followerIds);
  const personalitiesById = new Map(
    personalities.map((personality) => [personality.id, personality]),
  );

  return follows.flatMap((follow) => {
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
}
