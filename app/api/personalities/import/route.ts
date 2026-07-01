import { getAuthUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";
import {
  ensurePersonalityIndexes,
  findPersonalityByNftTokenId,
  updatePersonality,
} from "@/lib/personalities";
import { isCatalogPersonality } from "@/lib/personalities/catalog";
import { getWalletAuthContext } from "@/lib/nft/auth-context";
import {
  normalizeWalletAddress,
  readPersonalityIdForToken,
  readTokenOwner,
  walletOwnsToken,
} from "@/lib/nft/chain";
import { getDefaultChainId, isNftEnabled } from "@/lib/nft/config";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return authError("You must be logged in to import an NFT.", 401);
    }

    if (!isNftEnabled()) {
      return authError("NFT import is not configured.", 503);
    }

    const body = (await request.json()) as { tokenId?: string };
    const tokenId = body.tokenId?.trim();

    if (!tokenId || !/^\d+$/.test(tokenId)) {
      return authError("A valid token ID is required.", 400);
    }

    const walletContext = await getWalletAuthContext(authUser);

    if (walletContext.linkedWalletAddresses.length === 0) {
      return authError("Link a wallet before importing an NFT.", 400);
    }

    const chainId = getDefaultChainId();
    const owner = await readTokenOwner(tokenId, chainId);

    if (!owner) {
      return authError("NFT not found on chain.", 404);
    }

    const ownsToken = walletContext.linkedWalletAddresses.some((address) =>
      walletOwnsToken(address, tokenId, chainId),
    );

    if (!ownsToken) {
      return authError("Your linked wallet does not own this NFT.", 403);
    }

    await ensurePersonalityIndexes();

    let personality = await findPersonalityByNftTokenId(tokenId);

    if (!personality) {
      const personalityId = await readPersonalityIdForToken(tokenId, chainId);

      if (!personalityId) {
        return authError("No personality is linked to this NFT.", 404);
      }

      const { getPersonalityById } = await import("@/lib/personalities");
      personality = await getPersonalityById(personalityId);
    }

    if (!personality || !personality.nft) {
      return authError("Personality not found for this NFT.", 404);
    }

    if (personality.ownerId === authUser.id) {
      return Response.json({ personality });
    }

    const updated = await updatePersonality(personality.id, {
      ownerId: authUser.id,
      nftOwnerAddress: normalizeWalletAddress(owner),
      importedViaNft: true,
      ...(isCatalogPersonality(personality) ? { role: "player" as const } : {}),
    });

    if (!updated) {
      return authError("Could not import personality.", 500);
    }

    return Response.json({ personality: updated });
  } catch (error) {
    console.error("Import NFT failed:", error);
    return authError("Could not import NFT personality.", 500);
  }
}
