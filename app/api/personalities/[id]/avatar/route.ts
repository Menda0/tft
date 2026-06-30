import { storeAvatarImage } from "@/lib/avatars/store-avatar";
import {
  claimAvatarGeneration,
  getPersonalityById,
  normalizePersonality,
  updatePersonality,
} from "@/lib/personalities";
import { getAuthUser } from "@/lib/auth/server";
import { generatePixelAvatar, AvatarGenerationError } from "@/lib/openai/avatar";
import { PinataUploadError } from "@/lib/pinata/upload-avatar";
import { authError } from "@/lib/auth/responses";
import { getWalletAuthContext } from "@/lib/nft/auth-context";
import { canManagePersonality } from "@/lib/nft/ownership";

export const maxDuration = 120;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return authError("You must be logged in.", 401);
    }

    const { id } = await context.params;
    const existing = await getPersonalityById(id);
    const walletContext = await getWalletAuthContext(authUser);

    if (
      !existing ||
      !canManagePersonality(
        walletContext.user,
        existing,
        walletContext.linkedWallets,
      )
    ) {
      return authError("Personality not found.", 404);
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

      return Response.json({
        personality: normalizePersonality(updated ?? claimed),
      });
    } catch (error) {
      console.error("Avatar generation failed:", error);
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

      if (error instanceof Error && error.message.includes("OPENAI_API_KEY")) {
        return authError("Missing OPENAI_API_KEY. Add it to your env file.", 500);
      }

      return Response.json(
        {
          personality: failed ? normalizePersonality(failed) : personality,
          error: "Could not generate pixel avatar with OpenAI.",
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("Avatar route failed:", error);
    return authError("Could not generate avatar.", 500);
  }
}
