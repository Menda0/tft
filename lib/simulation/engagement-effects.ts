import type { Post } from "@/lib/types/post";
import type { MemoryItem, Personality } from "@/lib/types/personality";

import { computeControversyDelta } from "@/lib/scoring/controversy";
import { computeSocialScoreDelta } from "@/lib/scoring/social-score";

import { hasMemory, recordFriendshipMemory, recordRivalryMemory, recordScandalMemory } from "./memory";
import {
  applyPersonalityUpdate,
  applyRelationshipDelta,
  applyStatsDelta,
} from "./personality-state";
import type { SimulationWorld } from "./world";

function getPersonality(
  world: SimulationWorld,
  personalityId: string,
): Personality | null {
  return world.personalities.find((entry) => entry.id === personalityId) ?? null;
}

function socialDelta(
  event: Parameters<typeof computeSocialScoreDelta>[0],
  actor?: Personality,
): { socialScore: number } {
  return {
    socialScore: computeSocialScoreDelta(event, { actor }),
  };
}

async function updateActorTowardTarget(
  world: SimulationWorld,
  actorId: string,
  targetId: string,
  options: {
    relationshipDelta?: Parameters<typeof applyRelationshipDelta>[2];
    actorStatsDelta?: Parameters<typeof applyStatsDelta>[1];
    targetStatsDelta?: Parameters<typeof applyStatsDelta>[1];
    actorMemory?: Personality["memory"];
    targetMemory?: Personality["memory"];
  },
): Promise<void> {
  const actor = getPersonality(world, actorId);

  if (!actor) {
    return;
  }

  const actorPatch: Parameters<typeof applyPersonalityUpdate>[2] = {};

  if (options.relationshipDelta) {
    actorPatch.relationships = applyRelationshipDelta(
      actor.relationships ?? {},
      targetId,
      options.relationshipDelta,
    );
  }

  if (options.actorStatsDelta) {
    actorPatch.stats = applyStatsDelta(actor.stats, options.actorStatsDelta);
  }

  if (options.actorMemory) {
    actorPatch.memory = options.actorMemory;
  }

  if (Object.keys(actorPatch).length > 0) {
    await applyPersonalityUpdate(world, actorId, actorPatch);
  }

  const target = getPersonality(world, targetId);

  if (!target) {
    return;
  }

  const targetPatch: Parameters<typeof applyPersonalityUpdate>[2] = {};

  if (options.relationshipDelta?.familiarity) {
    targetPatch.relationships = applyRelationshipDelta(
      target.relationships ?? {},
      actorId,
      { familiarity: options.relationshipDelta.familiarity },
    );
  }

  if (options.targetStatsDelta) {
    targetPatch.stats = applyStatsDelta(target.stats, options.targetStatsDelta);
  }

  if (options.targetMemory) {
    targetPatch.memory = options.targetMemory;
  }

  if (Object.keys(targetPatch).length > 0) {
    await applyPersonalityUpdate(world, targetId, targetPatch);
  }
}

async function applyRelationshipAndStats(
  world: SimulationWorld,
  actorId: string,
  targetId: string,
  options: {
    relationshipDelta?: Parameters<typeof applyRelationshipDelta>[2];
    actorStatsDelta?: Parameters<typeof applyStatsDelta>[1];
    targetStatsDelta?: Parameters<typeof applyStatsDelta>[1];
  },
): Promise<void> {
  await updateActorTowardTarget(world, actorId, targetId, options);
}

async function applyMemoryIfNeeded(
  world: SimulationWorld,
  actorId: string,
  targetId: string,
  buildMemories: (
    actor: Personality,
    target: Personality,
  ) => { actorMemory?: MemoryItem | null; targetMemory?: MemoryItem | null },
): Promise<void> {
  const actor = getPersonality(world, actorId);
  const target = getPersonality(world, targetId);

  if (!actor || !target) {
    return;
  }

  const { actorMemory, targetMemory } = buildMemories(actor, target);

  if (actorMemory) {
    await applyPersonalityUpdate(world, actorId, { memory: [actorMemory] });
  }

  if (targetMemory) {
    await applyPersonalityUpdate(world, targetId, { memory: [targetMemory] });
  }
}

export async function recordLikeEffects(
  world: SimulationWorld,
  actor: Personality,
  author: Personality,
): Promise<void> {
  await applyRelationshipAndStats(world, actor.id, author.id, {
    relationshipDelta: { admiration: 0.5, familiarity: 0.5 },
    targetStatsDelta: socialDelta("like_received", actor),
  });
}

export async function recordRepostEffects(
  world: SimulationWorld,
  actor: Personality,
  author: Personality,
): Promise<void> {
  await applyRelationshipAndStats(world, actor.id, author.id, {
    relationshipDelta: { admiration: 1, familiarity: 1 },
    targetStatsDelta: socialDelta("repost_received", actor),
  });
}

export async function recordFollowEffects(
  world: SimulationWorld,
  actor: Personality,
  author: Personality,
  post: Post,
): Promise<void> {
  await applyRelationshipAndStats(world, actor.id, author.id, {
    relationshipDelta: { trust: 1, admiration: 2, familiarity: 1 },
    targetStatsDelta: socialDelta("follow_received", actor),
  });

  await applyMemoryIfNeeded(world, actor.id, author.id, (freshActor, freshAuthor) => ({
    actorMemory: recordFriendshipMemory(freshActor, freshAuthor, post.topic),
  }));
}

export async function recordAgreeReplyEffects(
  world: SimulationWorld,
  actor: Personality,
  author: Personality,
  post: Post,
): Promise<void> {
  await applyRelationshipAndStats(world, actor.id, author.id, {
    relationshipDelta: { trust: 1, admiration: 1, familiarity: 1 },
    actorStatsDelta: socialDelta("agree_reply_written", actor),
    targetStatsDelta: socialDelta("agree_reply_on_post", actor),
  });

  await applyMemoryIfNeeded(world, actor.id, author.id, (freshActor, freshAuthor) => ({
    actorMemory: recordFriendshipMemory(freshActor, freshAuthor, post.topic),
  }));
}

export async function recordUnfollowEffects(
  world: SimulationWorld,
  actor: Personality,
  author: Personality,
  post: Post,
): Promise<void> {
  await applyRelationshipAndStats(world, actor.id, author.id, {
    relationshipDelta: { trust: -2, admiration: -2, rivalry: 1, familiarity: -1 },
    targetStatsDelta: {
      ...socialDelta("unfollow_after_conflict"),
      controversy: computeControversyDelta("unfollow_after_conflict"),
    },
  });

  await applyMemoryIfNeeded(world, actor.id, author.id, (freshActor, freshAuthor) => ({
    actorMemory: recordRivalryMemory(freshActor, freshAuthor, post.topic),
  }));
}

export async function recordDisagreeReplyEffects(
  world: SimulationWorld,
  actor: Personality,
  author: Personality,
  post: Post,
): Promise<void> {
  const scandalKey = `@${actor.handle}`;
  const scandalIsNew = !hasMemory(author, "scandal", scandalKey);
  const targetControversy =
    computeControversyDelta("disagree_reply_target") +
    (scandalIsNew ? computeControversyDelta("scandal_memory") : 0);

  await applyRelationshipAndStats(world, actor.id, author.id, {
    relationshipDelta: { trust: -1, rivalry: 2, familiarity: 1 },
    actorStatsDelta: {
      controversy: computeControversyDelta("disagree_reply_actor"),
    },
    targetStatsDelta: {
      controversy: targetControversy,
      ...socialDelta("disagree_reply_on_post"),
    },
  });

  await applyMemoryIfNeeded(world, actor.id, author.id, (freshActor, freshAuthor) => ({
    actorMemory: recordRivalryMemory(freshActor, freshAuthor, post.topic),
    targetMemory: recordScandalMemory(freshAuthor, freshActor, post.topic),
  }));
}
