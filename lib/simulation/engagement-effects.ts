import {
  computeControversyDelta,
  computeScaledControversyDelta,
} from "@/lib/scoring/controversy";
import { refreshGrossCloutInWorld } from "@/lib/scoring/refresh-gross-clout";
import type { Post, ReplyTone } from "@/lib/types/post";
import type { MemoryItem, Personality } from "@/lib/types/personality";

import {
  computeAgreeIntensity,
  computeAuthorHeatDefense,
  computeDisagreeIntensity,
  scaleRelationshipDelta,
} from "./engagement-intensity";
import {
  getRelationship,
  hasMemory,
  recordExchangeMemory,
  recordFriendshipMemory,
  recordRivalryMemory,
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

async function refreshTargetClout(
  world: SimulationWorld,
  targetId: string,
): Promise<void> {
  await refreshGrossCloutInWorld(world, targetId);
}

async function updateActorTowardTarget(
  world: SimulationWorld,
  actorId: string,
  targetId: string,
  options: {
    relationshipDelta?: Parameters<typeof applyRelationshipDelta>[2];
    targetRelationshipDelta?: Parameters<typeof applyRelationshipDelta>[2];
    actorStatsDelta?: Parameters<typeof applyStatsDelta>[1];
    targetStatsDelta?: Parameters<typeof applyStatsDelta>[1];
    actorMemory?: Personality["memory"];
    targetMemory?: Personality["memory"];
    refreshTargetClout?: boolean;
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

  if (options.targetRelationshipDelta) {
    targetPatch.relationships = applyRelationshipDelta(
      targetPatch.relationships ?? target.relationships ?? {},
      actorId,
      options.targetRelationshipDelta,
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

  if (options.refreshTargetClout ?? true) {
    await refreshTargetClout(world, targetId);
  }
}

async function applyRelationshipAndStats(
  world: SimulationWorld,
  actorId: string,
  targetId: string,
  options: {
    relationshipDelta?: Parameters<typeof applyRelationshipDelta>[2];
    targetRelationshipDelta?: Parameters<typeof applyRelationshipDelta>[2];
    actorStatsDelta?: Parameters<typeof applyStatsDelta>[1];
    targetStatsDelta?: Parameters<typeof applyStatsDelta>[1];
    refreshTargetClout?: boolean;
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
    refreshTargetClout: false,
  });
}

export async function recordRepostEffects(
  world: SimulationWorld,
  actor: Personality,
  author: Personality,
): Promise<void> {
  await applyRelationshipAndStats(world, actor.id, author.id, {
    relationshipDelta: { admiration: 1, familiarity: 1 },
    refreshTargetClout: false,
  });
}

export async function recordFollowEffects(
  world: SimulationWorld,
  actor: Personality,
  author: Personality,
  post: Post,
): Promise<void> {
  const relationship = getRelationship(actor, author.id);
  const intensity = computeAgreeIntensity(actor, relationship);

  await applyRelationshipAndStats(world, actor.id, author.id, {
    relationshipDelta: {
      trust: scaleRelationshipDelta(1, intensity),
      admiration: scaleRelationshipDelta(2, intensity),
      familiarity: 1,
    },
    refreshTargetClout: false,
  });

  await applyMemoryIfNeeded(world, actor.id, author.id, (freshActor, freshAuthor) => ({
    actorMemory: recordFriendshipMemory(freshActor, freshAuthor, post.topic),
  }));
}

export async function recordReplyToneEffects(
  world: SimulationWorld,
  actor: Personality,
  author: Personality,
  post: Post,
  tone: ReplyTone,
): Promise<void> {
  if (tone === "neutral") {
    await applyRelationshipAndStats(world, actor.id, author.id, {
      relationshipDelta: { familiarity: 0.5 },
      refreshTargetClout: false,
    });
    return;
  }

  if (tone === "agree" || tone === "strongly_agree") {
    const relationship = getRelationship(actor, author.id);
    const intensity =
      computeAgreeIntensity(actor, relationship) *
      (tone === "strongly_agree" ? 1.25 : 1);

    await applyRelationshipAndStats(world, actor.id, author.id, {
      relationshipDelta: {
        trust: scaleRelationshipDelta(tone === "strongly_agree" ? 2 : 1, intensity),
        admiration: scaleRelationshipDelta(tone === "strongly_agree" ? 2 : 1, intensity),
        familiarity: 1,
      },
      refreshTargetClout: false,
    });

    await applyMemoryIfNeeded(world, actor.id, author.id, (freshActor, freshAuthor) => ({
      actorMemory: recordFriendshipMemory(freshActor, freshAuthor, post.topic),
    }));
    return;
  }

  const relationship = getRelationship(actor, author.id);
  const intensity =
    computeDisagreeIntensity(actor, author, relationship) *
    (tone === "strongly_disagree" ? 1.35 : 1);
  const heatDefense = computeAuthorHeatDefense(author);
  const actorKey = `@${actor.handle}`;
  const isRepeat =
    hasMemory(author, "exchange", actorKey) ||
    hasMemory(author, "scandal", actorKey);
  const baseTargetHeat = computeControversyDelta(
    isRepeat ? "disagree_reply_target_repeat" : "disagree_reply_target",
  );
  const actorHeatBase =
    tone === "strongly_disagree" ? 2 : computeControversyDelta("disagree_reply_actor");
  const targetHeatBase = tone === "strongly_disagree" ? baseTargetHeat + 1 : baseTargetHeat;
  const actorHeat = computeScaledControversyDelta(actorHeatBase, intensity);
  const targetHeat = computeScaledControversyDelta(
    targetHeatBase,
    intensity * heatDefense,
  );

  await applyRelationshipAndStats(world, actor.id, author.id, {
    relationshipDelta: {
      trust: scaleRelationshipDelta(tone === "strongly_disagree" ? -2 : -1, intensity),
      rivalry: scaleRelationshipDelta(tone === "strongly_disagree" ? 3 : 2, intensity),
      familiarity: 1,
    },
    targetRelationshipDelta: {
      rivalry: scaleRelationshipDelta(tone === "strongly_disagree" ? 2 : 1, intensity),
    },
    actorStatsDelta: {
      controversy: actorHeat,
    },
    targetStatsDelta: {
      controversy: targetHeat,
    },
  });

  await applyMemoryIfNeeded(world, actor.id, author.id, (freshActor, freshAuthor) => ({
    actorMemory: recordRivalryMemory(freshActor, freshAuthor, post.topic),
    targetMemory: recordExchangeMemory(freshAuthor, freshActor, post.topic),
  }));
}

export async function recordAgreeReplyEffects(
  world: SimulationWorld,
  actor: Personality,
  author: Personality,
  post: Post,
): Promise<void> {
  await recordReplyToneEffects(world, actor, author, post, "agree");
}

export async function recordUnfollowEffects(
  world: SimulationWorld,
  actor: Personality,
  author: Personality,
  post: Post,
): Promise<void> {
  const relationship = getRelationship(actor, author.id);
  const intensity = computeDisagreeIntensity(actor, author, relationship);
  const heatDefense = computeAuthorHeatDefense(author);
  const targetHeat = computeScaledControversyDelta(
    computeControversyDelta("unfollow_after_conflict"),
    intensity * heatDefense,
  );

  await applyRelationshipAndStats(world, actor.id, author.id, {
    relationshipDelta: {
      trust: scaleRelationshipDelta(-2, intensity),
      admiration: scaleRelationshipDelta(-2, intensity),
      rivalry: scaleRelationshipDelta(1, intensity),
      familiarity: -1,
    },
    targetStatsDelta: {
      controversy: targetHeat,
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
  await recordReplyToneEffects(world, actor, author, post, "disagree");
}
