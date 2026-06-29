import { randomBytes } from "crypto";

import { ensureUserIndexes, createUser, findUserByUsername } from "@/lib/db/users";
import { hashPassword } from "@/lib/auth/password";

export const SYSTEM_USERNAME = "fakex_system";

export async function ensureSystemUser(): Promise<string> {
  await ensureUserIndexes();

  const existing = await findUserByUsername(SYSTEM_USERNAME);

  if (existing?._id) {
    return existing._id.toString();
  }

  const passwordHash = await hashPassword(
    randomBytes(32).toString("hex"),
  );
  const user = await createUser(SYSTEM_USERNAME, passwordHash);
  return user._id!.toString();
}
