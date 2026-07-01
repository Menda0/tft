import type { Hash } from "viem";

import {
  ensurePersonalityIndexes,
  getPersonalityById,
  updatePersonality,
} from "@/lib/personalities";
import { isCatalogPersonality } from "@/lib/personalities/catalog";
import { getAdminUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";
import { normalizeWalletAddress, verifyMintTransaction } from "@/lib/nft/chain";
import {
  getDefaultChainId,
  getNftContractAddress,
  getOpenSeaAssetUrl,
  isNftEnabled,
} from "@/lib/nft/config";
import { canAdminMintCatalogPersonality } from "@/lib/nft/ownership";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const adminUser = await getAdminUser(request);

    if (!adminUser) {
      return authError("Admin access required.", 403);
    }

    if (!isNftEnabled()) {
      return authError("NFT minting is not configured.", 503);
    }

    const { id } = await context.params;
    const body = (await request.json()) as { txHash?: string };

    if (!body.txHash?.trim() || !/^0x[a-fA-F0-9]{64}$/.test(body.txHash)) {
      return authError("A valid transaction hash is required.", 400);
    }

    await ensurePersonalityIndexes();
    const personality = await getPersonalityById(id);

    if (!personality || !isCatalogPersonality(personality)) {
      return authError("Catalog personality not found.", 404);
    }

    if (!canAdminMintCatalogPersonality(adminUser, personality)) {
      return authError("You cannot mint this catalog personality.", 403);
    }

    const chainId = getDefaultChainId();
    const receipt = await verifyMintTransaction(
      body.txHash as Hash,
      personality.id,
      chainId,
    );

    if (!receipt) {
      return authError("Could not verify mint transaction on chain.", 400);
    }

    const contractAddress = getNftContractAddress()!;
    const mintedAt = new Date();

    const updated = await updatePersonality(personality.id, {
      nft: {
        chainId,
        contractAddress,
        tokenId: receipt.tokenId,
        metadataUri: receipt.metadataUri,
        mintTxHash: body.txHash,
        mintedAt,
      },
      nftOwnerAddress: normalizeWalletAddress(receipt.ownerAddress),
      importedViaNft: false,
    });

    if (!updated) {
      return authError("Could not save NFT mint details.", 500);
    }

    return Response.json({
      personality: updated,
      openSeaUrl: getOpenSeaAssetUrl(
        chainId,
        contractAddress,
        receipt.tokenId,
      ),
    });
  } catch (error) {
    console.error("Catalog mint confirm failed:", error);
    return authError("Could not confirm NFT mint.", 500);
  }
}
