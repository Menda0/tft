import type { AuthUser } from "@/lib/auth/server";
import { isCatalogPersonality } from "@/lib/personalities/catalog";
import { normalizeWalletAddress } from "@/lib/nft/chain";
import type { LinkedWallet } from "@/lib/db/users";
import type { Personality } from "@/lib/types/personality";

function walletAddressesMatch(a: string, b: string): boolean {
  return normalizeWalletAddress(a).toLowerCase() === normalizeWalletAddress(b).toLowerCase();
}

export function userLinkedWalletAddresses(
  linkedWallets: LinkedWallet[] | undefined,
): string[] {
  if (!linkedWallets?.length) {
    return [];
  }

  return linkedWallets.map((wallet) =>
    normalizeWalletAddress(wallet.address).toLowerCase(),
  );
}

export function userOwnsNftWallet(
  linkedWallets: LinkedWallet[] | undefined,
  nftOwnerAddress: string | undefined,
): boolean {
  if (!nftOwnerAddress || !linkedWallets?.length) {
    return false;
  }

  const owner = normalizeWalletAddress(nftOwnerAddress).toLowerCase();
  return linkedWallets.some(
    (wallet) =>
      normalizeWalletAddress(wallet.address).toLowerCase() === owner,
  );
}

export function canMintPersonality(
  user: AuthUser,
  personality: Personality,
): boolean {
  if (personality.nft) {
    return false;
  }

  return personality.ownerId === user.id;
}

export function canManagePersonality(
  user: AuthUser,
  personality: Personality,
  linkedWallets: LinkedWallet[] | undefined,
): boolean {
  if (personality.nft) {
    if (personality.ownerId === user.id) {
      if (personality.importedViaNft) {
        return true;
      }

      return userOwnsNftWallet(linkedWallets, personality.nftOwnerAddress);
    }

    return userOwnsNftWallet(linkedWallets, personality.nftOwnerAddress);
  }

  return personality.ownerId === user.id;
}

export function canDeletePersonality(personality: Personality): boolean {
  return !personality.nft;
}

export function canAdminMintCatalogPersonality(
  user: AuthUser,
  personality: Personality,
): boolean {
  return (
    user.role === "admin" &&
    isCatalogPersonality(personality) &&
    !personality.nft
  );
}

export function canImportPersonality(
  linkedWallets: LinkedWallet[] | undefined,
  personality: Personality,
  tokenOwnerAddress: string,
): boolean {
  if (!personality.nft) {
    return false;
  }

  if (!userOwnsNftWallet(linkedWallets, tokenOwnerAddress)) {
    return false;
  }

  if (
    personality.importedViaNft &&
    personality.nftOwnerAddress &&
    !walletAddressesMatch(personality.nftOwnerAddress, tokenOwnerAddress)
  ) {
    return true;
  }

  return true;
}
