import type {
  ProfilePostItem,
  ProfilePostType,
  PublicPersonality,
} from "@/lib/types/profile";

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
): Promise<
  { ok: true; items: ProfilePostItem[] } | { ok: false; error: string }
> {
  const response = await fetch(
    `/api/u/${encodeURIComponent(handle)}/posts?type=${encodeURIComponent(type)}`,
  );
  const data = (await response.json()) as {
    items?: ProfilePostItem[];
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load posts." };
  }

  return { ok: true, items: data.items ?? [] };
}
