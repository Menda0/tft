import { findUserById } from "@/lib/db/users";
import { getBearerToken, verifyAuthToken } from "@/lib/auth/jwt";

export type AuthUser = {
  id: string;
  username: string;
};

export async function getAuthUser(
  request: Request,
): Promise<AuthUser | null> {
  const token = getBearerToken(request.headers.get("authorization"));

  if (!token) {
    return null;
  }

  try {
    const payload = verifyAuthToken(token);
    const user = await findUserById(payload.sub);

    if (!user || user.username !== payload.username) {
      return null;
    }

    return {
      id: user._id!.toString(),
      username: user.username,
    };
  } catch {
    return null;
  }
}
