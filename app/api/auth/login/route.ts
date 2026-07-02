import { findUserByUsername, setUserLastAccessAt, toPublicUser } from "@/lib/db/users";
import { signAuthToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { authError, authSuccess } from "@/lib/auth/responses";
import { validateCredentials } from "@/lib/auth/validation";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = body.username ?? "";
    const password = body.password ?? "";
    const validationError = validateCredentials(username, password, "login");

    if (validationError) {
      return authError(validationError, 400);
    }

    const normalizedUsername = username.trim().toLowerCase();
    const user = await findUserByUsername(normalizedUsername);

    if (!user) {
      return authError("Invalid username or password.", 401);
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);

    if (!passwordMatches) {
      return authError("Invalid username or password.", 401);
    }

    const publicUser = toPublicUser(user);
    await setUserLastAccessAt(publicUser.id);
    const token = signAuthToken({
      sub: publicUser.id,
      username: publicUser.username,
    });

    return authSuccess(publicUser, token);
  } catch (error) {
    console.error("Login failed:", error);
    return authError("Could not log in.", 500);
  }
}
