import { getAllPersonalities, isPersonalityDeleted, normalizePersonality } from "@/lib/personalities";
import { getRecentPosts } from "@/lib/db/posts";
import { getWorldState } from "@/lib/db/world";
import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";
import type { TrendingTopic, WorldState } from "@/lib/types/world";

export type SimulationWorld = {
  state: WorldState;
  personalities: Personality[];
  posts: Post[];
};

export async function loadSimulationWorld(): Promise<SimulationWorld> {
  const [state, personalities, posts] = await Promise.all([
    getWorldState(),
    getAllPersonalities(),
    getRecentPosts(100),
  ]);

  return {
    state,
    personalities: personalities
      .map(normalizePersonality)
      .filter((personality) => !isPersonalityDeleted(personality)),
    posts,
  };
}

export function getTopLevelPosts(posts: Post[]): Post[] {
  return posts.filter((post) => post.replyToPostId === null);
}

export function getTopicStrings(topics: TrendingTopic[]): string[] {
  return topics.map((entry) => entry.topic);
}
