import { getAuthUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";
import { deleteOwnedPersonality } from "@/lib/personalities/delete-owned-personality";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return authError("You must be logged in.", 401);
    }

    const { id } = await context.params;
    const result = await deleteOwnedPersonality(authUser.id, id);

    if (!result.ok) {
      return authError(result.error, result.status);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Delete personality failed:", error);
    return authError("Could not remove personality.", 500);
  }
}
