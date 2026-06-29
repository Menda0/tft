import {
  claimPostMediaGeneration,
  getPostsPendingMedia,
  updatePost,
} from "@/lib/db/posts";
import { storePostImage } from "@/lib/media/store-post-image";
import { generatePostPixelImage } from "@/lib/openai/post-pixel-image";
import { defaultRankNpcLog, type RankNpcLog } from "@/lib/rank-npcs/logger";
import { pickRandomImageUrl } from "@/lib/x/twitterapi";
import type { Post } from "@/lib/types/post";

function getPostMediaConcurrency(): number {
  const raw = process.env.RANK_NPC_POST_MEDIA_CONCURRENCY?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 2;
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  let index = 0;

  async function runWorker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      await worker(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => runWorker()),
  );
}

export async function generateMirroredPostMedia(
  postId: string,
  log: RankNpcLog = defaultRankNpcLog,
): Promise<boolean> {
  const claimed = await claimPostMediaGeneration(postId);

  if (!claimed) {
    return false;
  }

  const sourceImageUrl = pickRandomImageUrl(claimed.sourceImageUrls ?? []);

  if (!sourceImageUrl) {
    await updatePost(postId, { mediaStatus: "none" });
    return false;
  }

  log(
    `Generating pixel art media for post ${postId} (@${claimed.author.handle})...`,
  );

  try {
    const imageDataUrl = await generatePostPixelImage({
      sourceImageUrl,
      postContent: claimed.content,
    });
    const mediaUrl = await storePostImage({
      postId: claimed.id,
      handle: claimed.author.handle,
      imageDataUrl,
    });

    await updatePost(postId, {
      mediaUrl,
      mediaStatus: "ready",
    });
    log(`Post media ready for @${claimed.author.handle} (${postId}).`);
    return true;
  } catch (error) {
    console.error(`Post media generation failed for ${postId}:`, error);
    await updatePost(postId, { mediaStatus: "failed" });
    log(`Post media generation failed for @${claimed.author.handle} (${postId}).`);
    return false;
  }
}

export function scheduleMirroredPostMediaGeneration(
  postIds: string[],
  options: { log?: RankNpcLog; awaitCompletion?: boolean } = {},
): void {
  const log = options.log ?? defaultRankNpcLog;
  const awaitCompletion = options.awaitCompletion ?? false;
  const uniqueIds = [...new Set(postIds)];

  if (uniqueIds.length === 0) {
    return;
  }

  log(`Queued async pixel art for ${uniqueIds.length} post(s).`);

  const job = runWithConcurrency(
    uniqueIds,
    getPostMediaConcurrency(),
    async (postId) => {
      await generateMirroredPostMedia(postId, log);
    },
  );

  if (awaitCompletion) {
    void job.then(() => {
      log(`Finished ${uniqueIds.length} post media job(s).`);
    });
  } else {
    void job.catch((error) => {
      console.error("Background post media generation failed:", error);
    });
  }
}

export async function queuePendingMirroredPostMedia(
  options: { log?: RankNpcLog; awaitCompletion?: boolean } = {},
): Promise<number> {
  const pending = await getPostsPendingMedia();
  scheduleMirroredPostMediaGeneration(
    pending.map((post) => post.id),
    options,
  );
  return pending.length;
}

export function postNeedsMediaGeneration(post: Post): boolean {
  return (
    Boolean(post.sourceImageUrls?.length) &&
    (post.mediaStatus === "pending" || post.mediaStatus === "failed")
  );
}
