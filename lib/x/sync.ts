import {
  countMirroredPostsByPersonality,
  findPostByExternalId,
  insertPost,
  toPostAuthor,
  updatePost,
} from "@/lib/db/posts";
import {
  getActiveRankNpcs,
  normalizePersonality,
  updatePersonality,
} from "@/lib/personalities";
import { loadRankNpcConfig } from "@/lib/rank-npcs/config";
import { defaultRankNpcLog, type RankNpcLog } from "@/lib/rank-npcs/logger";
import { reconcileRankNpcs } from "@/lib/rank-npcs/reconcile";
import {
  scheduleMirroredPostMediaGeneration,
} from "@/lib/rank-npcs/post-media";
import {
  fetchUserTweets,
  isTwitterApiConfigured,
  sleep,
  truncateTweetText,
  TwitterApiError,
  pickRandomImageUrl,
  type ScrapedTweet,
} from "@/lib/x/twitterapi";
import type { Personality, XSyncState } from "@/lib/types/personality";

export type SyncCreatedPost = {
  externalId: string;
  preview: string;
};

export type SyncRankNpcResult = {
  xHandle: string;
  knockOffHandle: string;
  fetchedTweets: number;
  newPosts: number;
  createdPosts: SyncCreatedPost[];
  error?: string;
};

export type SyncAllRankNpcsResult = {
  reconcile: Awaited<ReturnType<typeof reconcileRankNpcs>>;
  synced: number;
  newPosts: number;
  results: SyncRankNpcResult[];
  errors: Array<{ xHandle: string; error: string }>;
  queryIdCacheAgeMs: number | null;
  skipped?: boolean;
  skipReason?: string;
};

const MISSING_AUTH_MESSAGE =
  "Missing TWITTERAPI_IO_API_KEY. Get one at https://twitterapi.io/ and add it to .env.";

function previewTweetText(text: string, maxLength = 72): string {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function buildXSyncUpdate(
  personality: Personality,
  xHandle: string,
  updates: Pick<XSyncState, "lastSyncedTweetId" | "lastSyncedAt">,
): XSyncState {
  return {
    xHandle,
    realName: personality.xSync?.realName,
    lastSyncedTweetId: updates.lastSyncedTweetId,
    lastSyncedAt: updates.lastSyncedAt,
  };
}

async function insertMirroredPost(
  personality: Personality,
  tweet: ScrapedTweet,
  log: RankNpcLog,
): Promise<{ inserted: boolean; mediaQueued: boolean }> {
  const existing = await findPostByExternalId(tweet.id);
  const sourceImageUrl = pickRandomImageUrl(tweet.imageUrls);
  const hasImages = Boolean(sourceImageUrl);

  if (existing) {
    if (
      hasImages &&
      !existing.mediaUrl &&
      existing.mediaStatus !== "generating" &&
      existing.mediaStatus !== "ready"
    ) {
      await updatePost(existing.id, {
        sourceImageUrls: [sourceImageUrl!],
        mediaStatus: "pending",
        mediaUrl: null,
      });
      scheduleMirroredPostMediaGeneration([existing.id], { log });
      return { inserted: false, mediaQueued: true };
    }

    return { inserted: false, mediaQueued: false };
  }

  const normalized = normalizePersonality(personality);

  const post = await insertPost({
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
    sourceImageUrls: hasImages ? [sourceImageUrl!] : undefined,
    mediaUrl: null,
    mediaStatus: hasImages ? "pending" : "none",
  });

  if (hasImages) {
    scheduleMirroredPostMediaGeneration([post.id], { log });
    log(
      `@${normalized.handle}: queued pixel art for post ${tweet.id} (1 of ${tweet.imageUrls.length} image(s)).`,
    );
  }

  return { inserted: true, mediaQueued: hasImages };
}

export async function syncRankNpc(
  personality: Personality,
  options: { initialPostCount?: number; log?: RankNpcLog } = {},
): Promise<SyncRankNpcResult> {
  const log = options.log ?? defaultRankNpcLog;
  const normalized = normalizePersonality(personality);
  const xHandle = normalized.xSync?.xHandle;
  const knockOffHandle = normalized.handle;
  const emptyResult = {
    knockOffHandle,
    fetchedTweets: 0,
    newPosts: 0,
    createdPosts: [] as SyncCreatedPost[],
  };

  if (!xHandle) {
    const error = "Missing xSync.xHandle on rank NPC.";
    log(`@${knockOffHandle}: sync failed — ${error}`);
    return {
      ...emptyResult,
      xHandle: "unknown",
      error,
    };
  }

  log(
    `Syncing @${xHandle} -> @${knockOffHandle} (${normalized.name})...`,
  );

  try {
    const mirroredCount = await countMirroredPostsByPersonality(normalized.id);
    const sinceId = normalized.xSync?.lastSyncedTweetId ?? null;
    const limit =
      mirroredCount === 0
        ? Math.max(1, options.initialPostCount ?? 3)
        : 20;

    log(
      `@${xHandle}: fetching up to ${limit} tweet(s) (${mirroredCount} mirrored post(s) already stored${sinceId ? `, since ${sinceId}` : ""}).`,
    );

    const tweets = await fetchUserTweets(xHandle, {
      limit,
      sinceId: mirroredCount > 0 ? sinceId : null,
    });

    log(`@${xHandle}: fetched ${tweets.length} tweet(s) from TwitterAPI.io.`);

    let newPosts = 0;
    let newestTweetId = sinceId;
    const createdPosts: SyncCreatedPost[] = [];

    for (const tweet of [...tweets].reverse()) {
      const result = await insertMirroredPost(normalized, tweet, log);

      if (result.inserted) {
        newPosts += 1;
        const preview = previewTweetText(tweet.text);
        createdPosts.push({
          externalId: tweet.id,
          preview,
        });
        log(
          `@${knockOffHandle}: created mirrored post ${tweet.id} — "${preview}"`,
        );
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
        xSync: buildXSyncUpdate(normalized, xHandle, {
          lastSyncedTweetId: latest.id,
          lastSyncedAt: new Date(),
        }),
      });
    } else if (newestTweetId && newestTweetId !== sinceId) {
      await updatePersonality(normalized.id, {
        xSync: buildXSyncUpdate(normalized, xHandle, {
          lastSyncedTweetId: newestTweetId,
          lastSyncedAt: new Date(),
        }),
      });
    }

    if (newPosts === 0) {
      log(`@${knockOffHandle}: no new posts to mirror.`);
    } else {
      log(`@${knockOffHandle}: mirrored ${newPosts} new post(s).`);
    }

    return {
      xHandle,
      knockOffHandle,
      fetchedTweets: tweets.length,
      newPosts,
      createdPosts,
    };
  } catch (error) {
    const message =
      error instanceof TwitterApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown sync error.";

    log(`@${knockOffHandle}: sync failed — ${message}`);

    return {
      xHandle,
      knockOffHandle,
      fetchedTweets: 0,
      newPosts: 0,
      createdPosts: [],
      error: message,
    };
  }
}

export async function syncActiveRankNpcs(
  options: { initialPostCount?: number; log?: RankNpcLog } = {},
): Promise<
  Pick<
    SyncAllRankNpcsResult,
    "synced" | "newPosts" | "results" | "errors" | "queryIdCacheAgeMs" | "skipped" | "skipReason"
  >
> {
  const log = options.log ?? defaultRankNpcLog;
  const personalities = await getActiveRankNpcs();

  if (personalities.length === 0) {
    log("No active rank NPCs to sync.");
    return {
      synced: 0,
      newPosts: 0,
      results: [],
      errors: [],
      queryIdCacheAgeMs: null,
    };
  }

  if (!isTwitterApiConfigured()) {
    log(MISSING_AUTH_MESSAGE);
    const results = personalities.map((personality) => {
      const normalized = normalizePersonality(personality);
      const xHandle = normalized.xSync?.xHandle ?? "unknown";

      return {
        xHandle,
        knockOffHandle: normalized.handle,
        fetchedTweets: 0,
        newPosts: 0,
        createdPosts: [] as SyncCreatedPost[],
        error: MISSING_AUTH_MESSAGE,
      };
    });

    return {
      synced: 0,
      newPosts: 0,
      results,
      errors: results.map((result) => ({
        xHandle: result.xHandle,
        error: result.error!,
      })),
      queryIdCacheAgeMs: null,
      skipped: true,
      skipReason: MISSING_AUTH_MESSAGE,
    };
  }

  const results: SyncRankNpcResult[] = [];
  const errors: Array<{ xHandle: string; error: string }> = [];
  let synced = 0;
  let newPosts = 0;

  for (const personality of personalities) {
    const result = await syncRankNpc(personality, {
      initialPostCount: options.initialPostCount,
      log,
    });

    results.push(result);
    synced += 1;
    newPosts += result.newPosts;

    if (result.error) {
      errors.push({ xHandle: result.xHandle, error: result.error });
    }

    const delayRaw = process.env.TWITTERAPI_IO_SYNC_DELAY_MS?.trim() ??
      process.env.X_SYNC_DELAY_MS?.trim();
    const delay = delayRaw ? Number.parseInt(delayRaw, 10) : 500;

    if (Number.isFinite(delay) && delay > 0) {
      await sleep(delay);
    }
  }

  log(
    `X sync finished: ${newPosts} new post(s) across ${synced} NPC(s), ${errors.length} error(s).`,
  );

  return {
    synced,
    newPosts,
    results,
    errors,
    queryIdCacheAgeMs: null,
  };
}

export async function syncAllRankNpcs(
  options: { log?: RankNpcLog } = {},
): Promise<SyncAllRankNpcsResult> {
  const log = options.log ?? defaultRankNpcLog;
  const config = await loadRankNpcConfig();
  const reconcile = await reconcileRankNpcs(config, log);
  const sync = await syncActiveRankNpcs({
    initialPostCount: config.initialPostCount,
    log,
  });

  return {
    reconcile,
    ...sync,
  };
}
