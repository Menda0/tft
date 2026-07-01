import { storeAvatarImage } from "@/lib/avatars/store-avatar";
import {
  claimAvatarGeneration,
  getPersonalityById,
  normalizePersonality,
  updatePersonality,
} from "@/lib/personalities";
import { isCatalogPersonality } from "@/lib/personalities/catalog";
import { queueBootstrapAssetGeneration } from "@/lib/personalities/bootstrap-assets";
import { getAdminUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";
import { generatePixelAvatar, AvatarGenerationError } from "@/lib/openai/avatar";
import { PinataUploadError } from "@/lib/pinata/upload-avatar";

export const maxDuration = 120;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const adminUser = await getAdminUser(request);

    if (!adminUser) {
      return authError("Admin access required.", 403);
    }

    const { id } = await context.params;
    const existing = await getPersonalityById(id);

    if (!existing || !isCatalogPersonality(existing)) {
      return authError("Catalog personality not found.", 404);
    }

    const personality = normalizePersonality(existing);

    if (personality.avatarStatus === "ready") {
      return Response.json({ personality });
    }

    if (personality.avatarStatus === "generating") {
      return Response.json({ personality, status: "generating" });
    }

    const claimed = await claimAvatarGeneration(id);

    if (!claimed) {
      const current = await getPersonalityById(id);
      return Response.json({
        personality: current ? normalizePersonality(current) : personality,
      });
    }

    try {
      const imageDataUrl = await generatePixelAvatar({
        name: claimed.name,
        handle: claimed.handle,
        kind: claimed.kind,
        gender: claimed.gender,
        pronouns: claimed.pronouns,
        archetype: claimed.archetype,
        traits: claimed.traits,
        interests: claimed.interests,
      });

      const avatarUrl = await storeAvatarImage({
        personalityId: id,
        handle: claimed.handle,
        imageDataUrl,
      });

      const updated = await updatePersonality(id, {
        avatarUrl,
        avatarStatus: "ready",
      });

      if (
        updated &&
        (updated.descriptionStatus === "pending" ||
          updated.descriptionStatus === "failed")
      ) {
        void queueBootstrapAssetGeneration([updated]).catch((error) => {
          console.error("Catalog description generation failed:", error);
        });
      }

      return Response.json({
        personality: normalizePersonality(updated ?? claimed),
      });
    } catch (error) {
      console.error("Catalog avatar generation failed:", error);
      const failed = await updatePersonality(id, { avatarStatus: "failed" });

      if (error instanceof AvatarGenerationError) {
        return Response.json(
          {
            personality: failed ? normalizePersonality(failed) : personality,
            error: error.message,
            details: error.details,
          },
          { status: 502 },
        );
      }

      if (error instanceof PinataUploadError) {
        return Response.json(
          {
            personality: failed ? normalizePersonality(failed) : personality,
            error: error.message,
            details: error.details,
          },
          { status: 502 },
        );
      }

      return Response.json(
        {
          personality: failed ? normalizePersonality(failed) : personality,
          error: "Could not generate pixel avatar.",
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("Catalog avatar route failed:", error);
    return authError("Could not generate avatar.", 500);
  }
}
