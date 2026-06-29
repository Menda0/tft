import {
  getPersonalityById,
  isPersonalityDeleted,
  softDeletePersonalities,
} from "@/lib/personalities";

export type DeleteOwnedPersonalityResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function deleteOwnedPersonality(
  ownerId: string,
  personalityId: string,
): Promise<DeleteOwnedPersonalityResult> {
  const existing = await getPersonalityById(personalityId);

  if (!existing || existing.ownerId !== ownerId) {
    return { ok: false, error: "Personality not found.", status: 404 };
  }

  if (isPersonalityDeleted(existing)) {
    return { ok: false, error: "Personality already removed.", status: 409 };
  }

  const deleted = await softDeletePersonalities([personalityId]);

  if (deleted === 0) {
    return { ok: false, error: "Could not remove personality.", status: 500 };
  }

  return { ok: true };
}
