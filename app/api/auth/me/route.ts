import { findUserById, toPublicUser } from "@/lib/db/users";
import { getBearerToken, verifyAuthToken } from "@/lib/auth/jwt";
import { authError } from "@/lib/auth/responses";

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));

    if (!token) {
      return authError("Missing authorization token.", 401);
    }

    const payload = verifyAuthToken(token);
    const user = await findUserById(payload.sub);

    if (!user || user.username !== payload.username) {
      return authError("Invalid session.", 401);
    }

    return Response.json({ user: toPublicUser(user) });
  } catch {
    return authError("Invalid or expired session.", 401);
  }
}
