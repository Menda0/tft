import { findUserByUsername } from "@/lib/db/users";
import {
  getPersonalitiesCollection,
  normalizePersonality,
} from "@/lib/personalities";
import { mergeNotDeleted } from "@/lib/db/active-filters";
import { normalizeStoredStats } from "@/lib/personalities/stats";
import { attachSocialRanksToPersonalities } from "@/lib/profile/social-rank";
import type { FarmerProfile } from "@/lib/types/farmer";

async function findFarmerPersonalities(ownerId: string) {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection
    .find(
      mergeNotDeleted({
        ownerId,
        $or: [{ role: { $exists: false } }, { role: "player" as const }],
      }),
    )
    .sort({ createdAt: -1 })
    .toArray();

  return personalities.map(normalizePersonality);
}

export async function buildFarmerProfile(
  username: string,
): Promise<FarmerProfile | null> {
  const user = await findUserByUsername(username);

  if (!user?._id) {
    return null;
  }

  const personalities = await findFarmerPersonalities(user._id.toString());
  const ranked = await attachSocialRanksToPersonalities(personalities);

  let totalClout = 0;
  let totalHeat = 0;

  const entries = ranked.map((personality) => {
    const stats = normalizeStoredStats(personality.stats);
    totalClout += stats.socialScore;
    totalHeat += stats.controversy;

    return {
      ...personality,
      stats,
    };
  });

  return {
    username: user.username,
    totalClout,
    totalHeat,
    personalities: entries,
  };
}
