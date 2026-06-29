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

import {
  getDailyPostLimit,
  startOfRollingWindow,
} from "./limits";
import { truncateForLog, type SimulationLogFn } from "./logger";
import { pickTopicForPersonality } from "./topics";
import type { SimulationWorld } from "./world";
import { getTopLevelPosts } from "./world";

export type CreatePostResult =
  | { ok: true; post: Post }
  | { ok: false; reason: "daily_limit" | "no_topic" | "generation_failed" };

function authorFromPersonality(personality: Personality) {
  return toPostAuthor({
    personalityId: personality.id,
    name: personality.name,
    handle: personality.handle,
    archetype: personality.archetype,
    avatarUrl: personality.avatarUrl,
  });
}

function pickRandomPost(
  posts: Post[],
  excludePersonalityId?: string,
): Post | null {
  const candidates = posts.filter(
    (post) =>
      post.replyToPostId === null &&
      post.author.personalityId !== excludePersonalityId,
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

function pickRandomPersonality(
  personalities: Personality[],
  excludePersonalityId: string,
): Personality | null {
  const candidates = personalities.filter(
    (personality) => personality.id !== excludePersonalityId,
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
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

export async function replyToPost(
  personality: Personality,
  world: SimulationWorld,
): Promise<Post | null> {
  const target = pickRandomPost(world.posts, personality.id);

  if (!target) {
    return null;
  }

  try {
    const content = await generateLLMReply(personality, target);
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
    target.stats.replies += 1;
    world.posts.unshift(reply);
    return reply;
  } catch (error) {
    console.error(`replyToPost failed for ${personality.handle}:`, error);
    return null;
  }
}

export async function repostPost(
  personality: Personality,
  world: SimulationWorld,
): Promise<Post | null> {
  const target = pickRandomPost(world.posts, personality.id);

  if (!target) {
    return null;
  }

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
  target.stats.reposts += 1;
  world.posts.unshift(repost);
  return repost;
}

export async function followSomeone(
  personality: Personality,
  world: SimulationWorld,
): Promise<Personality | null> {
  const target = pickRandomPersonality(world.personalities, personality.id);

  if (!target) {
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

export function getReplyTargetPosts(world: SimulationWorld): Post[] {
  return getTopLevelPosts(world.posts);
}
