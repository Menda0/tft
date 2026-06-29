import { buildMySocial } from "@/lib/desktop/build-my-social";
import { getAuthUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return authError("You must be logged in to view My Social.", 401);
    }

    const payload = await buildMySocial(authUser.id);
    return Response.json(payload);
  } catch (error) {
    console.error("My Social load failed:", error);
    return Response.json(
      { error: "Could not load My Social." },
      { status: 500 },
    );
  }
}
