import {
  createUser,
  ensureUserIndexes,
  findUserByUsername,
  toPublicUser,
} from "@/lib/db/users";
import { signAuthToken } from "@/lib/auth/jwt";
import { hashPassword } from "@/lib/auth/password";
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
    const validationError = validateCredentials(username, password, "register");

    if (validationError) {
      return authError(validationError, 400);
    }

    await ensureUserIndexes();

    const normalizedUsername = username.trim().toLowerCase();
    const existingUser = await findUserByUsername(normalizedUsername);

    if (existingUser) {
      return authError("Username is already taken.", 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(normalizedUsername, passwordHash);
    const publicUser = toPublicUser(user);
    const token = signAuthToken({
      sub: publicUser.id,
      username: publicUser.username,
    });

    return authSuccess(publicUser, token, 201);
  } catch (error) {
    console.error("Register failed:", error);
    return authError("Could not create account.", 500);
  }
}
