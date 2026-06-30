import { getAuthUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";
import { createSiweNonce } from "@/lib/nft/siwe";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return authError("You must be logged in to link a wallet.", 401);
    }

    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address")?.trim();

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return authError("A valid wallet address is required.", 400);
    }

    const nonce = createSiweNonce(address);

    return Response.json({ nonce, address });
  } catch (error) {
    console.error("Wallet nonce failed:", error);
    return authError("Could not create wallet sign-in nonce.", 500);
  }
}
