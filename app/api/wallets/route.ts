import { getAuthUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";
import {
  getLinkedWalletsForUser,
  unlinkWalletForUser,
} from "@/lib/db/users";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return authError("You must be logged in.", 401);
    }

    const wallets = await getLinkedWalletsForUser(authUser.id);
    return Response.json({ wallets });
  } catch (error) {
    console.error("List wallets failed:", error);
    return authError("Could not load linked wallets.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return authError("You must be logged in.", 401);
    }

    const body = (await request.json()) as { address?: string };
    const address = body.address?.trim();

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return authError("A valid wallet address is required.", 400);
    }

    const wallets = await unlinkWalletForUser(authUser.id, address);

    if (!wallets) {
      return authError("Could not unlink wallet.", 500);
    }

    return Response.json({ wallets });
  } catch (error) {
    console.error("Unlink wallet failed:", error);
    return authError("Could not unlink wallet.", 500);
  }
}
