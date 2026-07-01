import { getAuthUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";
import { findMintedPersonalitiesForWallets } from "@/lib/personalities";
import { getWalletAuthContext } from "@/lib/nft/auth-context";
import {
  getDefaultChainId,
  getNftContractAddress,
  getOpenSeaAssetUrl,
  isNftEnabled,
} from "@/lib/nft/config";
import { readMintFee } from "@/lib/nft/chain";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return authError("You must be logged in.", 401);
    }

    if (!isNftEnabled()) {
      return Response.json({ nfts: [], enabled: false });
    }

    const { linkedWalletAddresses } = await getWalletAuthContext(authUser);
    const hasLinkedWallet = linkedWalletAddresses.length > 0;
    const personalities = await findMintedPersonalitiesForWallets(
      linkedWalletAddresses,
    );
    const contractAddress = getNftContractAddress()!;
    const chainId = getDefaultChainId();
    const mintFee = (await readMintFee(chainId)).toString();

    const nfts = personalities.map((personality) => {
      const alreadyOwnedByAccount = personality.ownerId === authUser.id;

      return {
        personalityId: personality.id,
        name: personality.name,
        handle: personality.handle,
        avatarUrl: personality.avatarUrl,
        tokenId: personality.nft?.tokenId ?? null,
        importedViaNft: alreadyOwnedByAccount,
        importable: !alreadyOwnedByAccount,
        openSeaUrl:
          personality.nft?.tokenId
            ? getOpenSeaAssetUrl(
                chainId,
                contractAddress,
                personality.nft.tokenId,
              )
            : null,
      };
    });

    return Response.json({
      enabled: true,
      hasLinkedWallet,
      contractAddress,
      chainId,
      mintFee,
      nfts,
    });
  } catch (error) {
    console.error("List wallet NFTs failed:", error);
    return authError("Could not load wallet NFTs.", 500);
  }
}
