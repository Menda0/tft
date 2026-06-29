import type { MemoryItem } from "@/lib/types/personality";
import type {
  ProfileCharacterSheet,
  ProfileFollower,
  ProfilePostItem,
  ProfilePostType,
  ProfileRelationship,
  PublicPersonality,
} from "@/lib/types/profile";
import {
  CHARACTER_SECTION_PAGE_SIZE,
  PAGE_SIZE,
} from "@/lib/pagination";

export const PROFILE_PAGE_SIZE = PAGE_SIZE;
export const PROFILE_CHARACTER_SECTION_PAGE_SIZE = CHARACTER_SECTION_PAGE_SIZE;

export async function fetchProfile(
  handle: string,
): Promise<
  { ok: true; personality: PublicPersonality } | { ok: false; error: string }
> {
  const response = await fetch(`/api/u/${encodeURIComponent(handle)}`);
  const data = (await response.json()) as {
    personality?: PublicPersonality;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load profile." };
  }

  if (!data.personality) {
    return { ok: false, error: "Invalid server response." };
  }

  return { ok: true, personality: data.personality };
}

export async function fetchProfilePosts(
  handle: string,
  type: ProfilePostType,
  options: { limit?: number; offset?: number } = {},
): Promise<
  | { ok: true; items: ProfilePostItem[]; hasMore: boolean }
  | { ok: false; error: string }
> {
  const limit = options.limit ?? PROFILE_PAGE_SIZE;
  const offset = options.offset ?? 0;
  const response = await fetch(
    `/api/u/${encodeURIComponent(handle)}/posts?type=${encodeURIComponent(type)}&limit=${limit}&offset=${offset}`,
  );
  const data = (await response.json()) as {
    items?: ProfilePostItem[];
    hasMore?: boolean;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load posts." };
  }

  if (!data.items || typeof data.hasMore !== "boolean") {
    return { ok: false, error: "Invalid server response." };
  }

  return { ok: true, items: data.items, hasMore: data.hasMore };
}

export async function fetchProfileFollowers(
  handle: string,
): Promise<
  { ok: true; followers: ProfileFollower[] } | { ok: false; error: string }
> {
  const response = await fetch(
    `/api/u/${encodeURIComponent(handle)}/followers`,
  );
  const data = (await response.json()) as {
    followers?: ProfileFollower[];
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load followers." };
  }

  return { ok: true, followers: data.followers ?? [] };
}

export async function fetchProfileCharacter(
  handle: string,
): Promise<
  { ok: true; character: ProfileCharacterSheet } | { ok: false; error: string }
> {
  const response = await fetch(
    `/api/u/${encodeURIComponent(handle)}/character`,
  );
  const data = (await response.json()) as {
    character?: ProfileCharacterSheet;
    error?: string;
  };

  if (!response.ok) {
    return {
      ok: false,
      error: data.error ?? "Could not load character sheet.",
    };
  }

  if (!data.character) {
    return { ok: false, error: "Invalid server response." };
  }

  return { ok: true, character: data.character };
}

export async function fetchProfileCharacterMemories(
  handle: string,
  options: { limit?: number; offset?: number } = {},
): Promise<
  | { ok: true; items: MemoryItem[]; hasMore: boolean }
  | { ok: false; error: string }
> {
  const limit = options.limit ?? PROFILE_CHARACTER_SECTION_PAGE_SIZE;
  const offset = options.offset ?? 0;
  const response = await fetch(
    `/api/u/${encodeURIComponent(handle)}/character/memories?limit=${limit}&offset=${offset}`,
  );
  const data = (await response.json()) as {
    items?: MemoryItem[];
    hasMore?: boolean;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load memories." };
  }

  if (!data.items || typeof data.hasMore !== "boolean") {
    return { ok: false, error: "Invalid server response." };
  }

  return { ok: true, items: data.items, hasMore: data.hasMore };
}

export async function fetchProfileCharacterRelationships(
  handle: string,
  options: { limit?: number; offset?: number } = {},
): Promise<
  | { ok: true; items: ProfileRelationship[]; hasMore: boolean }
  | { ok: false; error: string }
> {
  const limit = options.limit ?? PROFILE_CHARACTER_SECTION_PAGE_SIZE;
  const offset = options.offset ?? 0;
  const response = await fetch(
    `/api/u/${encodeURIComponent(handle)}/character/relationships?limit=${limit}&offset=${offset}`,
  );
  const data = (await response.json()) as {
    items?: ProfileRelationship[];
    hasMore?: boolean;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load relationships." };
  }

  if (!data.items || typeof data.hasMore !== "boolean") {
    return { ok: false, error: "Invalid server response." };
  }

  return { ok: true, items: data.items, hasMore: data.hasMore };
}
