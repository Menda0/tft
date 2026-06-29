import {
  claimPostMediaGeneration,
  getPostsPendingMedia,
  updatePost,
} from "@/lib/db/posts";
import { storePostImage } from "@/lib/media/store-post-image";
import {
  generateMirroredPostPixelImage,
  PostPixelImageSkippedError,
} from "@/lib/openai/post-pixel-image";
import { defaultRankNpcLog, type RankNpcLog } from "@/lib/rank-npcs/logger";
import type { Post } from "@/lib/types/post";

function getPostMediaConcurrency(): number {
  const raw = process.env.RANK_NPC_POST_MEDIA_CONCURRENCY?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 2;
}

function shuffleSourceImageUrls(urls: string[]): string[] {
  const shuffled = [...urls];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
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

async function generateMirroredPostPixelImageFromSources(input: {
  sourceImageUrls: string[];
  postContent: string;
}): Promise<string> {
  const candidates = shuffleSourceImageUrls(input.sourceImageUrls);
  let lastSkipReason = "unsafe_content";

  for (const sourceImageUrl of candidates) {
    try {
      return await generateMirroredPostPixelImage({
        sourceImageUrl,
        postContent: input.postContent,
      });
    } catch (error) {
      if (error instanceof PostPixelImageSkippedError) {
        lastSkipReason = error.reason;
        continue;
      }

      throw error;
    }
  }

  throw new PostPixelImageSkippedError(lastSkipReason);
}

export async function generateMirroredPostMedia(
  postId: string,
  log: RankNpcLog = defaultRankNpcLog,
): Promise<boolean> {
  const claimed = await claimPostMediaGeneration(postId);

  if (!claimed) {
    return false;
  }

  const sourceImageUrls = claimed.sourceImageUrls ?? [];

  if (sourceImageUrls.length === 0) {
    await updatePost(postId, { mediaStatus: "none" });
    return false;
  }

  log(
    `Generating pixel art media for post ${postId} (@${claimed.author.handle})...`,
  );

  try {
    const imageDataUrl = await generateMirroredPostPixelImageFromSources({
      sourceImageUrls,
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
    if (error instanceof PostPixelImageSkippedError) {
      await updatePost(postId, { mediaStatus: "none" });
      log(
        `Skipped pixel art for @${claimed.author.handle} (${postId}): ${error.reason}.`,
      );
      return false;
    }

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
