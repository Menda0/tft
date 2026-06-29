import {
  countMirroredPostsByPersonality,
  findPostByExternalId,
  insertPost,
  toPostAuthor,
} from "@/lib/db/posts";
import {
  getActiveRankNpcs,
  normalizePersonality,
  updatePersonality,
} from "@/lib/personalities";
import { loadRankNpcConfig } from "@/lib/rank-npcs/config";
import { reconcileRankNpcs } from "@/lib/rank-npcs/reconcile";
import { getQueryIdCacheAgeMs } from "@/lib/x/query-ids";
import {
  fetchUserTweets,
  sleep,
  truncateTweetText,
  XScraperError,
  type ScrapedTweet,
} from "@/lib/x/scraper";
import type { Personality } from "@/lib/types/personality";

export type SyncRankNpcResult = {
  xHandle: string;
  newPosts: number;
  error?: string;
};

export type SyncAllRankNpcsResult = {
  reconcile: Awaited<ReturnType<typeof reconcileRankNpcs>>;
  synced: number;
  newPosts: number;
  errors: Array<{ xHandle: string; error: string }>;
  queryIdCacheAgeMs: number | null;
};

async function insertMirroredPost(
  personality: Personality,
  tweet: ScrapedTweet,
): Promise<boolean> {
  const existing = await findPostByExternalId(tweet.id);

  if (existing) {
    return false;
  }

  const normalized = normalizePersonality(personality);

  await insertPost({
    author: toPostAuthor({
      personalityId: normalized.id,
      name: normalized.name,
      handle: normalized.handle,
      archetype: normalized.archetype ?? "other",
      avatarUrl: normalized.avatarUrl,
    }),
    content: truncateTweetText(tweet.text),
    topic: null,
    createdAt: tweet.createdAt,
    tickNumber: 0,
    replyToPostId: null,
    repostOfPostId: null,
    source: "mirrored",
    externalId: tweet.id,
  });

  return true;
}

export async function syncRankNpc(
  personality: Personality,
  options: { initialPostCount?: number } = {},
): Promise<SyncRankNpcResult> {
  const normalized = normalizePersonality(personality);
  const xHandle = normalized.xSync?.xHandle;

  if (!xHandle) {
    return {
      xHandle: "unknown",
      newPosts: 0,
      error: "Missing xSync.xHandle on rank NPC.",
    };
  }

  try {
    const mirroredCount = await countMirroredPostsByPersonality(normalized.id);
    const sinceId = normalized.xSync?.lastSyncedTweetId ?? null;
    const limit =
      mirroredCount === 0
        ? Math.max(1, options.initialPostCount ?? 3)
        : 20;

    const tweets = await fetchUserTweets(xHandle, {
      limit,
      sinceId: mirroredCount > 0 ? sinceId : null,
    });

    let newPosts = 0;
    let newestTweetId = sinceId;

    for (const tweet of [...tweets].reverse()) {
      const inserted = await insertMirroredPost(normalized, tweet);

      if (inserted) {
        newPosts += 1;
      }

      if (!newestTweetId || tweet.id > newestTweetId) {
        newestTweetId = tweet.id;
      }
    }

    if (tweets.length > 0) {
      const latest = tweets.reduce((best, tweet) =>
        tweet.id > best.id ? tweet : best,
      );

      await updatePersonality(normalized.id, {
        xSync: {
          xHandle,
          lastSyncedTweetId: latest.id,
          lastSyncedAt: new Date(),
        },
      });
    } else if (newestTweetId && newestTweetId !== sinceId) {
      await updatePersonality(normalized.id, {
        xSync: {
          xHandle,
          lastSyncedTweetId: newestTweetId,
          lastSyncedAt: new Date(),
        },
      });
    }

    return { xHandle, newPosts };
  } catch (error) {
    const message =
      error instanceof XScraperError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown sync error.";

    return { xHandle, newPosts: 0, error: message };
  }
}

export async function syncActiveRankNpcs(
  options: { initialPostCount?: number } = {},
): Promise<Pick<SyncAllRankNpcsResult, "synced" | "newPosts" | "errors" | "queryIdCacheAgeMs">> {
  const personalities = await getActiveRankNpcs();

  const errors: Array<{ xHandle: string; error: string }> = [];
  let synced = 0;
  let newPosts = 0;

  for (const personality of personalities) {
    const result = await syncRankNpc(personality, {
      initialPostCount: options.initialPostCount,
    });

    synced += 1;
    newPosts += result.newPosts;

    if (result.error) {
      errors.push({ xHandle: result.xHandle, error: result.error });
    }

    const delayRaw = process.env.X_SYNC_DELAY_MS?.trim();
    const delay = delayRaw ? Number.parseInt(delayRaw, 10) : 2000;

    if (Number.isFinite(delay) && delay > 0) {
      await sleep(delay);
    }
  }

  return {
    synced,
    newPosts,
    errors,
    queryIdCacheAgeMs: getQueryIdCacheAgeMs(),
  };
}

export async function syncAllRankNpcs(): Promise<SyncAllRankNpcsResult> {
  const config = await loadRankNpcConfig();
  const reconcile = await reconcileRankNpcs(config);
  const sync = await syncActiveRankNpcs({
    initialPostCount: config.initialPostCount,
  });

  return {
    reconcile,
    ...sync,
  };
}
