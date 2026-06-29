import { storeAvatarImage } from "@/lib/avatars/store-avatar";
import {
  claimAvatarGeneration,
  claimDescriptionGeneration,
  getActiveRankNpcs,
  normalizePersonality,
  updatePersonality,
} from "@/lib/personalities";
import { loadRankNpcConfig } from "@/lib/rank-npcs/config";
import { reconcileRankNpcs } from "@/lib/rank-npcs/reconcile";
import { generatePixelAvatar } from "@/lib/openai/avatar";
import { generateProfileDescription } from "@/lib/openai/description";
import { syncActiveRankNpcs } from "@/lib/x/sync";

async function generateAssetsForPersonality(
  personalityId: string,
): Promise<void> {
  const claimedDescription = await claimDescriptionGeneration(personalityId);

  if (claimedDescription) {
    try {
      const description = await generateProfileDescription({
        name: claimedDescription.name,
        handle: claimedDescription.handle,
        kind: claimedDescription.kind,
        gender: claimedDescription.gender,
        pronouns: claimedDescription.pronouns,
        archetype: claimedDescription.archetype,
        traits: claimedDescription.traits,
        politicalSwing: claimedDescription.politicalSwing,
        interests: claimedDescription.interests,
      });

      await updatePersonality(personalityId, {
        description,
        descriptionStatus: "ready",
      });
    } catch (error) {
      console.error(
        `Description generation failed for ${claimedDescription.handle}:`,
        error,
      );
      await updatePersonality(personalityId, {
        descriptionStatus: "failed",
      });
    }
  }

  const claimedAvatar = await claimAvatarGeneration(personalityId);

  if (claimedAvatar) {
    try {
      const imageDataUrl = await generatePixelAvatar({
        name: claimedAvatar.name,
        handle: claimedAvatar.handle,
        kind: claimedAvatar.kind,
        gender: claimedAvatar.gender,
        pronouns: claimedAvatar.pronouns,
        archetype: claimedAvatar.archetype,
        traits: claimedAvatar.traits,
        interests: claimedAvatar.interests,
      });
      const avatarUrl = await storeAvatarImage({
        personalityId: claimedAvatar.id,
        handle: claimedAvatar.handle,
        imageDataUrl,
      });

      await updatePersonality(personalityId, {
        avatarUrl,
        avatarStatus: "ready",
      });
    } catch (error) {
      console.error(
        `Avatar generation failed for ${claimedAvatar.handle}:`,
        error,
      );
      await updatePersonality(personalityId, {
        avatarStatus: "failed",
      });
    }
  }
}

export async function seedRankNpcsFromConfig(): Promise<{
  reconcile: Awaited<ReturnType<typeof reconcileRankNpcs>>;
  sync: Awaited<ReturnType<typeof syncActiveRankNpcs>>;
}> {
  const config = await loadRankNpcConfig();
  const reconcile = await reconcileRankNpcs(config);
  const sync = await syncActiveRankNpcs({
    initialPostCount: config.initialPostCount,
  });

  const personalities = await getActiveRankNpcs();

  for (const personality of personalities) {
    const normalized = normalizePersonality(personality);

    if (
      normalized.avatarStatus === "pending" ||
      normalized.avatarStatus === "failed" ||
      normalized.descriptionStatus === "pending" ||
      normalized.descriptionStatus === "failed"
    ) {
      await generateAssetsForPersonality(normalized.id);
    }
  }

  return { reconcile, sync };
}
