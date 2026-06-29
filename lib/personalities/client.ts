import { profileKindUsesIdentity } from "@/lib/avatars/page-kind";
import type { PersonalityListItem } from "@/lib/profile/social-rank";
import type {
  Archetype,
  Gender,
  PageKind,
  Personality,
  PoliticalSwing,
  Pronouns,
  Traits,
} from "@/lib/types/personality";

export type CreatePersonalityPayload = {
  name: string;
  handle: string;
  kind: PageKind;
  gender?: Gender;
  pronouns?: Pronouns;
  archetype: Archetype | null;
  traits: Traits;
  politicalSwing: PoliticalSwing;
  interests: string;
};

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function listPersonalitiesRequest(
  token: string,
): Promise<
  { ok: true; personalities: PersonalityListItem[] } | { ok: false; error: string }
> {
  const response = await fetch("/api/personalities", {
    headers: authHeaders(token),
  });

  const data = (await response.json()) as {
    personalities?: PersonalityListItem[];
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load personalities." };
  }

  return { ok: true, personalities: data.personalities ?? [] };
}

export async function generateAvatarRequest(
  token: string,
  personalityId: string,
): Promise<void> {
  await fetch(`/api/personalities/${personalityId}/avatar`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export async function generateDescriptionRequest(
  token: string,
  personalityId: string,
): Promise<void> {
  await fetch(`/api/personalities/${personalityId}/description`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export async function deletePersonalityRequest(
  token: string,
  personalityId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/personalities/${personalityId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not remove personality." };
  }

  return { ok: true };
}

export async function createPersonalityRequest(
  token: string,
  payload: CreatePersonalityPayload,
): Promise<
  { ok: true; personality: Personality } | { ok: false; error: string }
> {
  const response = await fetch("/api/personalities", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: payload.name,
      handle: payload.handle,
      kind: payload.kind,
      ...(profileKindUsesIdentity(payload.kind)
        ? { gender: payload.gender, pronouns: payload.pronouns }
        : {}),
      archetype: payload.archetype,
      traits: payload.traits,
      politicalSwing: payload.politicalSwing,
      interests: payload.interests,
    }),
  });

  const data = (await response.json()) as {
    personality?: Personality;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not create personality." };
  }

  if (!data.personality) {
    return { ok: false, error: "Invalid server response." };
  }

  return { ok: true, personality: data.personality };
}

export async function checkHandleAvailabilityRequest(
  handle: string,
): Promise<
  | { ok: true; available: boolean; error: string | null }
  | { ok: false; error: string }
> {
  const response = await fetch(
    `/api/personalities/check-handle?handle=${encodeURIComponent(handle)}`,
  );

  const data = (await response.json()) as {
    available?: boolean;
    error?: string | null;
  };

  if (!response.ok) {
    return {
      ok: false,
      error: data.error ?? "Could not check handle availability.",
    };
  }

  return {
    ok: true,
    available: Boolean(data.available),
    error: data.error ?? null,
  };
}
