import type { Archetype, Gender, Personality, Traits } from "@/lib/types/personality";

export type CreatePersonalityPayload = {
  name: string;
  handle: string;
  gender: Gender;
  archetype: Archetype;
  traits: Traits;
  interests: string;
};

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
      gender: payload.gender,
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
