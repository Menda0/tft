import type { AuthUser } from "@/lib/auth/server";
import {
  getLinkedWalletsForUser,
  type LinkedWallet,
} from "@/lib/db/users";
import { userLinkedWalletAddresses } from "@/lib/nft/ownership";

export type WalletAuthContext = {
  user: AuthUser;
  linkedWallets: LinkedWallet[];
  linkedWalletAddresses: string[];
};

export async function getWalletAuthContext(
  user: AuthUser,
): Promise<WalletAuthContext> {
  const linkedWallets = await getLinkedWalletsForUser(user.id);

  return {
    user,
    linkedWallets,
    linkedWalletAddresses: userLinkedWalletAddresses(linkedWallets),
  };
}
