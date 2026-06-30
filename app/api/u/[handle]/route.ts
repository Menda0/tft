import { findPublicPersonalityByHandle } from "@/lib/personalities";
import { isRankNpc } from "@/lib/personalities/rank-npc";
import { toPublicPersonality } from "@/lib/profile/build-profile";
import { getAuthUser } from "@/lib/auth/server";
import { getWalletAuthContext } from "@/lib/nft/auth-context";
import { canManagePersonality } from "@/lib/nft/ownership";
import { normalizeHandle } from "@/lib/personalities/validation";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { handle: rawHandle } = await context.params;
    const handle = normalizeHandle(rawHandle);
    const personality = await findPublicPersonalityByHandle(handle);

    if (!personality) {
      return Response.json({ error: "Profile not found." }, { status: 404 });
    }

    const authUser = await getAuthUser(request);
    const publicPersonality = await toPublicPersonality(personality);
    const walletContext = authUser
      ? await getWalletAuthContext(authUser)
      : null;

    return Response.json({
      personality: {
        ...publicPersonality,
        isOwner: Boolean(
          authUser &&
            !isRankNpc(personality) &&
            walletContext &&
            canManagePersonality(
              walletContext.user,
              personality,
              walletContext.linkedWallets,
            ),
        ),
      },
    });
  } catch (error) {
    console.error("Profile load failed:", error);
    return Response.json({ error: "Could not load profile." }, { status: 500 });
  }
}
