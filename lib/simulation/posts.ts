import {
  incrementPostStat,
  insertPost,
  toPostAuthor,
} from "@/lib/db/posts";
import { updatePersonality } from "@/lib/personalities";
import { generateLLMPost, generateLLMReply } from "@/lib/openai/post";
import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

import { pickTopicForPersonality } from "./topics";
import type { SimulationWorld } from "./world";
import { getTopLevelPosts } from "./world";

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

export async function createPost(
  personality: Personality,
  world: SimulationWorld,
): Promise<Post | null> {
  const topic = pickTopicForPersonality(
    personality,
    world.state.trendingTopics,
  );

  try {
    const content = await generateLLMPost(personality, topic);
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
    return post;
  } catch (error) {
    console.error(`createPost failed for ${personality.handle}:`, error);
    return null;
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
