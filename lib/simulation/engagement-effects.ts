import type { Post } from "@/lib/types/post";
import type { MemoryItem, Personality } from "@/lib/types/personality";

import {
  recordFriendshipMemory,
  recordRivalryMemory,
  recordScandalMemory,
} from "./memory";
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
    targetStatsDelta: { reputation: 1 },
  });
}

export async function recordRepostEffects(
  world: SimulationWorld,
  actor: Personality,
  author: Personality,
): Promise<void> {
  await applyRelationshipAndStats(world, actor.id, author.id, {
    relationshipDelta: { admiration: 1, familiarity: 1 },
    targetStatsDelta: { reputation: 2 },
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
    actorStatsDelta: { reputation: 1 },
    targetStatsDelta: { reputation: 1 },
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
    targetStatsDelta: { reputation: -1 },
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
  await applyRelationshipAndStats(world, actor.id, author.id, {
    relationshipDelta: { trust: -1, rivalry: 2, familiarity: 1 },
    actorStatsDelta: { controversy: 2 },
    targetStatsDelta: { controversy: 3, reputation: -1 },
  });

  await applyMemoryIfNeeded(world, actor.id, author.id, (freshActor, freshAuthor) => ({
    actorMemory: recordRivalryMemory(freshActor, freshAuthor, post.topic),
    targetMemory: recordScandalMemory(freshAuthor, freshActor, post.topic),
  }));
}
