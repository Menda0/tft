import type { Hash } from "viem";

import { getAuthUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";
import {
  ensurePersonalityIndexes,
  getPersonalityById,
} from "@/lib/personalities";
import { getWalletAuthContext } from "@/lib/nft/auth-context";
import { buildPersonalityNftMetadata } from "@/lib/nft/build-metadata";
import { readMintFee } from "@/lib/nft/chain";
import {
  getDefaultChainId,
  getNftContractAddress,
  isNftEnabled,
} from "@/lib/nft/config";
import { FAKEX_PERSONALITY_NFT_ABI } from "@/lib/nft/contract";
import { canMintPersonality } from "@/lib/nft/ownership";
import { uploadJsonToPinata } from "@/lib/pinata/upload-json";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return authError("You must be logged in to mint an NFT.", 401);
    }

    if (!isNftEnabled()) {
      return authError("NFT minting is not configured.", 503);
    }

    const { id } = await context.params;
    await ensurePersonalityIndexes();
    const personality = await getPersonalityById(id);

    if (!personality) {
      return authError("Personality not found.", 404);
    }

    const walletContext = await getWalletAuthContext(authUser);

    if (!canMintPersonality(walletContext.user, personality)) {
      return authError("You cannot mint this personality as an NFT.", 403);
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
      abi: FAKEX_PERSONALITY_NFT_ABI,
      functionName: "mint",
    });
  } catch (error) {
    console.error("Mint prepare failed:", error);
    return authError("Could not prepare NFT mint.", 500);
  }
}
