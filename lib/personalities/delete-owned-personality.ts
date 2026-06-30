import {
  getPersonalityById,
  isPersonalityDeleted,
  softDeletePersonalities,
} from "@/lib/personalities";
import type { LinkedWallet } from "@/lib/db/users";
import type { AuthUser } from "@/lib/auth/server";
import {
  canDeletePersonality,
  canManagePersonality,
} from "@/lib/nft/ownership";

export type DeleteOwnedPersonalityResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function deleteOwnedPersonality(
  user: AuthUser,
  personalityId: string,
  linkedWallets: LinkedWallet[] = [],
): Promise<DeleteOwnedPersonalityResult> {
  const existing = await getPersonalityById(personalityId);

  if (
    !existing ||
    !canManagePersonality(user, existing, linkedWallets)
  ) {
    return { ok: false, error: "Personality not found.", status: 404 };
  }

  if (!canDeletePersonality(existing)) {
    return {
      ok: false,
      error: "Minted personalities cannot be deleted.",
      status: 403,
    };
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
