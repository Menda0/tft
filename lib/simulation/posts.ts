import {
  countOriginalPostsSince,
  getOriginalPostTopicsSince,
  incrementPostStat,
  insertPost,
  toPostAuthor,
} from "@/lib/db/posts";
import { hasFollow, insertFollow } from "@/lib/db/follows";
import { updatePersonality } from "@/lib/personalities";
import { generateLLMPost, generateLLMReply } from "@/lib/openai/post";
import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

import type { ResponseTone } from "./engagement";
import {
  getDailyPostLimit,
  startOfRollingWindow,
} from "./limits";
import { truncateForLog, type SimulationLogFn } from "./logger";
import { pickTopicForPersonality } from "./topics";
import type { SimulationWorld } from "./world";

export type CreatePostResult =
  | { ok: true; post: Post }
  | { ok: false; reason: "daily_limit" | "no_topic" | "generation_failed" };

function authorFromPersonality(personality: Personality) {
  return toPostAuthor({
    personalityId: personality.id,
    name: personality.name,
    handle: personality.handle,
    archetype: personality.archetype ?? "",
    avatarUrl: personality.avatarUrl,
  });
}

function syncPostStat(
  world: SimulationWorld,
  postId: string,
  field: "replies" | "reposts" | "likes" | "views",
): void {
  const cached = world.posts.find((post) => post.id === postId);

  if (cached) {
    cached.stats[field] += 1;
  }
}

export async function canPersonalityPostToday(
  personalityId: string,
): Promise<boolean> {
  const since = startOfRollingWindow();
  const count = await countOriginalPostsSince(personalityId, since);
  return count < getDailyPostLimit();
}

export async function createPost(
  personality: Personality,
  world: SimulationWorld,
  log?: SimulationLogFn,
): Promise<CreatePostResult> {
  const since = startOfRollingWindow();
  const postsToday = await countOriginalPostsSince(personality.id, since);

  if (postsToday >= getDailyPostLimit()) {
    return { ok: false, reason: "daily_limit" };
  }

  const usedTopics = await getOriginalPostTopicsSince(personality.id, since);
  const topicLabels = world.state.trendingTopics.map((entry) => entry.topic);
  const topic = pickTopicForPersonality(personality, topicLabels, usedTopics);

  if (!topic) {
    return { ok: false, reason: "no_topic" };
  }

  try {
    const content = await generateLLMPost(personality, topic, {
      onStage: (stage) => {
        if (!log) {
          return;
        }

        if (stage === "research") {
          log(
            "info",
            `@${personality.handle} researching: ${truncateForLog(topic, 100)}`,
          );
        } else {
          log("info", `@${personality.handle} writing post...`);
        }
      },
    });
    const post = await insertPost({
      author: authorFromPersonality(personality),
      content,
      topic,
      createdAt: new Date(),
      tickNumber: world.state.tickNumber + 1,
      replyToPostId: null,
      repostOfPostId: null,
    });

    world.posts.unshift(post);
    return { ok: true, post };
  } catch (error) {
    console.error(`createPost failed for ${personality.handle}:`, error);
    return { ok: false, reason: "generation_failed" };
  }
}

export async function likePost(
  _personality: Personality,
  target: Post,
  world: SimulationWorld,
): Promise<void> {
  await incrementPostStat(target.id, "likes");
  syncPostStat(world, target.id, "likes");
}

export async function repostSpecificPost(
  personality: Personality,
  target: Post,
  world: SimulationWorld,
): Promise<Post> {
  const repost = await insertPost({
    author: authorFromPersonality(personality),
    content: target.content,
    topic: target.topic,
    createdAt: new Date(),
    tickNumber: world.state.tickNumber + 1,
    replyToPostId: null,
    repostOfPostId: target.id,
  });

  await incrementPostStat(target.id, "reposts");
  syncPostStat(world, target.id, "reposts");
  world.posts.unshift(repost);
  return repost;
}

export async function replyToSpecificPost(
  personality: Personality,
  target: Post,
  world: SimulationWorld,
  options?: { tone?: ResponseTone },
): Promise<Post | null> {
  try {
    const content = await generateLLMReply(personality, target, options);
    const reply = await insertPost({
      author: authorFromPersonality(personality),
      content,
      topic: target.topic,
      createdAt: new Date(),
      tickNumber: world.state.tickNumber + 1,
      replyToPostId: target.id,
      repostOfPostId: null,
    });

    await incrementPostStat(target.id, "replies");
    syncPostStat(world, target.id, "replies");
    world.posts.unshift(reply);
    return reply;
  } catch (error) {
    console.error(`replyToSpecificPost failed for ${personality.handle}:`, error);
    return null;
  }
}

export async function followAuthor(
  personality: Personality,
  target: Personality,
  world: SimulationWorld,
): Promise<Personality | null> {
  if (target.id === personality.id) {
    return null;
  }

  if (await hasFollow(personality.id, target.id)) {
    return null;
  }

  const follow = await insertFollow(personality.id, target.id);

  if (!follow) {
    return null;
  }

  const nextFollowers = target.stats.followers + 1;
  await updatePersonality(target.id, {
    stats: {
      ...target.stats,
      followers: nextFollowers,
    },
  });

  target.stats.followers = nextFollowers;
  return target;
}

export async function recordPostView(
  target: Post,
  world: SimulationWorld,
): Promise<void> {
  await incrementPostStat(target.id, "views");
  syncPostStat(world, target.id, "views");
}
