import type { Personality } from "@/lib/types/personality";

export function isRankNpc(personality: Personality): boolean {
  return personality.role === "rank_npc";
}

export function isActiveRankNpc(personality: Personality): boolean {
  return personality.role === "rank_npc" && personality.rankNpcActive !== false;
}

export function isPublicPersonality(personality: Personality): boolean {
  if (personality.role === "rank_npc" && personality.rankNpcActive === false) {
    return false;
  }

  return true;
}

export function getRankNpcRealName(personality: Personality): string {
  const realName = personality.xSync?.realName?.trim();

  if (realName) {
    return realName;
  }

  const xHandle = personality.xSync?.xHandle ?? personality.handle;
  return xHandle
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\d+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
