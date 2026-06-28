import { profileKindUsesIdentity } from "@/lib/avatars/page-kind";
import type { Archetype, Gender, PageKind, Personality, Pronouns, Traits } from "@/lib/types/personality";

export type CreatePersonalityPayload = {
  name: string;
  handle: string;
  kind: PageKind;
  gender?: Gender;
  pronouns?: Pronouns;
  archetype: Archetype;
  traits: Traits;
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
  { ok: true; personalities: Personality[] } | { ok: false; error: string }
> {
  const response = await fetch("/api/personalities", {
    headers: authHeaders(token),
  });

  const data = (await response.json()) as {
    personalities?: Personality[];
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
