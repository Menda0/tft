import { getAuthUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";
import { linkWalletForUser } from "@/lib/db/users";
import { getDefaultChainId } from "@/lib/nft/config";
import { verifySiweMessage } from "@/lib/nft/siwe";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return authError("You must be logged in to link a wallet.", 401);
    }

    const body = (await request.json()) as {
      message?: string;
      signature?: string;
    };

    if (!body.message?.trim() || !body.signature?.trim()) {
      return authError("Wallet signature is required.", 400);
    }

    const verified = await verifySiweMessage({
      message: body.message,
      signature: body.signature,
    });

    if (!verified.ok) {
      return authError(verified.error, 400);
    }

    const wallets = await linkWalletForUser(
      authUser.id,
      verified.address,
      getDefaultChainId(),
    );

    if (!wallets) {
      return authError("Could not link wallet.", 500);
    }

    return Response.json({ wallets });
  } catch (error) {
    console.error("Wallet link failed:", error);
    return authError("Could not link wallet.", 500);
  }
}
