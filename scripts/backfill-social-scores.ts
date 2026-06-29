import { aggregateSocialScoreByPersonality } from "@/lib/db/posts";
import {
  getAllPersonalities,
  getPersonalitiesCollection,
  normalizePersonality,
} from "@/lib/personalities";
import {
  aggregatePostSocialScore,
  backfillSocialScoreFromFollowers,
} from "@/lib/scoring/social-score";

async function main(): Promise<void> {
  const [personalities, postTotals] = await Promise.all([
    getAllPersonalities(),
    aggregateSocialScoreByPersonality(),
  ]);
  const collection = await getPersonalitiesCollection();
  let updated = 0;

  for (const personality of personalities) {
    const normalized = normalizePersonality(personality);
    const totals = postTotals.get(normalized.id) ?? {
      likes: 0,
      reposts: 0,
      replies: 0,
    };
    const socialScore =
      aggregatePostSocialScore(totals) +
      backfillSocialScoreFromFollowers(normalized.stats.followers);

    await collection.updateOne(
      { id: normalized.id },
      {
        $set: {
          "stats.socialScore": socialScore,
        },
        $unset: {
          "stats.reputation": "",
        },
      },
    );
    updated += 1;
  }

  console.info(`Backfilled socialScore for ${updated} personalities.`);
}

main().catch((error) => {
  console.error("Social score backfill failed:", error);
  process.exit(1);
});
