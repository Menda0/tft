import type {
  MemoryItem,
  MemoryType,
  Personality,
  Relationship,
} from "@/lib/types/personality";

export const MAX_STORED_MEMORIES = 25;
export const MAX_PROMPT_MEMORIES = 6;

const RIVALRY_THRESHOLD = 7;
const FRIENDSHIP_THRESHOLD = 7;

function clampImportance(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value)));
}

function normalizeMemoryItem(item: MemoryItem): MemoryItem {
  return {
    type: item.type,
    text: item.text.trim(),
    importance: clampImportance(item.importance),
  };
}

export function trimMemories(memories: MemoryItem[]): MemoryItem[] {
  return [...memories]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, MAX_STORED_MEMORIES);
}

export function mergeMemories(
  existing: MemoryItem[],
  incoming: MemoryItem[],
): MemoryItem[] {
  if (incoming.length === 0) {
    return trimMemories(existing);
  }

  return trimMemories([...existing, ...incoming.map(normalizeMemoryItem)]);
}

export function addMemory(
  personality: Personality,
  item: MemoryItem,
): MemoryItem[] {
  return mergeMemories(personality.memory ?? [], [item]);
}

export function hasMemory(
  personality: Personality,
  type: MemoryType,
  textIncludes: string,
): boolean {
  const needle = textIncludes.toLowerCase();

  return (personality.memory ?? []).some(
    (memory) =>
      memory.type === type && memory.text.toLowerCase().includes(needle),
  );
}

export function formatMemoriesForPrompt(
  memories: MemoryItem[] | undefined,
  limit = MAX_PROMPT_MEMORIES,
): string | null {
  if (!memories || memories.length === 0) {
    return null;
  }

  const lines = [...memories]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit)
    .map((memory) => `- ${memory.text}`);

  return lines.join("\n");
}

function topicLabel(topic: string | null | undefined): string {
  if (!topic?.trim()) {
    return "a post";
  }

  return `"${topic.trim()}"`;
}

export function getRelationship(
  personality: Personality,
  targetId: string,
): Relationship {
  return (
    personality.relationships[targetId] ?? {
      trust: 5,
      rivalry: 0,
      admiration: 0,
      familiarity: 0,
    }
  );
}

export function recordRivalryMemory(
  actor: Personality,
  target: Personality,
  topic: string | null | undefined,
): MemoryItem | null {
  const relationship = getRelationship(actor, target.id);

  if (relationship.rivalry < RIVALRY_THRESHOLD) {
    return null;
  }

  if (hasMemory(actor, "rivalry", `@${target.handle}`)) {
    return null;
  }

  return {
    type: "rivalry",
    text: `${actor.name} argued with @${target.handle} over ${topicLabel(topic)}.`,
    importance: 8,
  };
}

export function recordFriendshipMemory(
  actor: Personality,
  target: Personality,
  topic: string | null | undefined,
): MemoryItem | null {
  const relationship = getRelationship(actor, target.id);

  if (relationship.admiration < FRIENDSHIP_THRESHOLD) {
    return null;
  }

  if (hasMemory(actor, "friendship", `@${target.handle}`)) {
    return null;
  }

  return {
    type: "friendship",
    text: `${actor.name} bonded with @${target.handle} over ${topicLabel(topic)}.`,
    importance: 6,
  };
}

export function recordScandalMemory(
  target: Personality,
  actor: Personality,
  topic: string | null | undefined,
): MemoryItem | null {
  const key = `@${actor.handle}`;

  if (hasMemory(target, "scandal", key)) {
    return null;
  }

  return {
    type: "scandal",
    text: `@${target.handle} got pushback from ${actor.name} on ${topicLabel(topic)}.`,
    importance: 6,
  };
}

export function filterEvolutionMemories(memories: MemoryItem[]): MemoryItem[] {
  return memories.filter(
    (memory) => memory.type === "milestone" || memory.type === "belief_change",
  );
}
