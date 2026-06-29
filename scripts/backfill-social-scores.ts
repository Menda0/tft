import "./load-env";

import {
  aggregateSocialScoreByPersonality,
  getPostsCollection,
} from "@/lib/db/posts";
import { mergeNotDeletedPost } from "@/lib/db/active-filters";
import {
  getAllPersonalities,
  getPersonalitiesCollection,
  normalizePersonality,
} from "@/lib/personalities";
import { normalizeStoredStatsRaw } from "@/lib/personalities/stats";
import { computeGrossClout } from "@/lib/scoring/social-score";

async function backfillReplyToneCounters(): Promise<number> {
  const collection = await getPostsCollection();
  const posts = await collection
    .find(
      mergeNotDeletedPost({
        replyToPostId: { $ne: null },
      }),
      { projection: { id: 1, replyToPostId: 1, replyTone: 1 } },
    )
    .toArray();

  const toneCounts = new Map<
    string,
    { agreeReplies: number; disagreeReplies: number; replies: number }
  >();

  for (const post of posts) {
    if (!post.replyToPostId) {
      continue;
    }

    const existing = toneCounts.get(post.replyToPostId) ?? {
      agreeReplies: 0,
      disagreeReplies: 0,
      replies: 0,
    };

    existing.replies += 1;

    if (post.replyTone === "disagree") {
      existing.disagreeReplies += 1;
    } else {
      existing.agreeReplies += 1;
    }

    toneCounts.set(post.replyToPostId, existing);
  }

  let updated = 0;

  for (const [postId, counts] of toneCounts) {
    const result = await collection.updateOne(mergeNotDeletedPost({ id: postId }), {
      $set: {
        "stats.replies": counts.replies,
        "stats.agreeReplies": counts.agreeReplies,
        "stats.disagreeReplies": counts.disagreeReplies,
      },
    });

    if (result.modifiedCount > 0) {
      updated += 1;
    }
  }

  return updated;
}

async function main(): Promise<void> {
  const replyPostsUpdated = await backfillReplyToneCounters();
  console.info(`Backfilled reply tone counters on ${replyPostsUpdated} posts.`);

  const [personalities, postTotals] = await Promise.all([
    getAllPersonalities(),
    aggregateSocialScoreByPersonality(),
  ]);
  const collection = await getPersonalitiesCollection();
  let updated = 0;

  for (const personality of personalities) {
    const normalized = normalizePersonality(personality);
    const rawStats = normalizeStoredStatsRaw(normalized.stats);
    const totals = postTotals.get(normalized.id) ?? {
      likes: 0,
      reposts: 0,
      replies: 0,
      views: 0,
      agreeReplies: 0,
      disagreeReplies: 0,
    };
    const socialScore = computeGrossClout(totals, rawStats.followers);

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

  console.info(`Backfilled gross socialScore for ${updated} personalities.`);
}

main().catch((error) => {
  console.error("Social score backfill failed:", error);
  process.exit(1);
});
