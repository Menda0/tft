import {
  ensurePersonalityIndexes,
  getPersonalityById,
} from "@/lib/personalities";
import { isCatalogPersonality } from "@/lib/personalities/catalog";
import { getAdminUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";
import { buildPersonalityNftMetadata } from "@/lib/nft/build-metadata";
import { readMintFee } from "@/lib/nft/chain";
import {
  getDefaultChainId,
  getNftContractAddress,
  getTreasuryAddress,
  isNftEnabled,
} from "@/lib/nft/config";
import { FAKEX_PERSONALITY_NFT_ABI } from "@/lib/nft/contract";
import { canAdminMintCatalogPersonality } from "@/lib/nft/ownership";
import { uploadJsonToPinata } from "@/lib/pinata/upload-json";

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

    const treasuryAddress = getTreasuryAddress();

    if (!treasuryAddress) {
      return authError("NFT treasury address is not configured.", 503);
    }

    const { id } = await context.params;
    await ensurePersonalityIndexes();
    const personality = await getPersonalityById(id);

    if (!personality || !isCatalogPersonality(personality)) {
      return authError("Catalog personality not found.", 404);
    }

    if (!canAdminMintCatalogPersonality(adminUser, personality)) {
      return authError("You cannot mint this catalog personality.", 403);
    }

    if (personality.avatarStatus !== "ready" || !personality.avatarUrl) {
      return authError(
        "Generate an avatar before minting this personality as an NFT.",
        400,
      );
    }

    const metadata = buildPersonalityNftMetadata(personality);
    const uploaded = await uploadJsonToPinata({
      name: `fakex-nft-${personality.handle}-${personality.id}`,
      json: metadata,
    });

    const contractAddress = getNftContractAddress()!;
    const chainId = getDefaultChainId();
    const mintFee = await readMintFee(chainId);

    return Response.json({
      contractAddress,
      chainId,
      mintFee: mintFee.toString(),
      metadataUri: uploaded.ipfsUri,
      personalityId: personality.id,
      mintToAddress: treasuryAddress,
      abi: FAKEX_PERSONALITY_NFT_ABI,
      functionName: "mint",
    });
  } catch (error) {
    console.error("Catalog mint prepare failed:", error);
    return authError("Could not prepare NFT mint.", 500);
  }
}
