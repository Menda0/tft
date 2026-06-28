export type UserRole = "admin" | "user";

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function parseAdminUsernames(): Set<string> {
  const raw = process.env.ADMIN_USERNAMES?.trim();

  if (!raw) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((username) => normalizeUsername(username))
      .filter(Boolean),
  );
}

let cachedAdminUsernames: Set<string> | null = null;

function getAdminUsernames(): Set<string> {
  if (!cachedAdminUsernames) {
    cachedAdminUsernames = parseAdminUsernames();
  }

  return cachedAdminUsernames;
}

export function isAdminUsername(username: string): boolean {
  return getAdminUsernames().has(normalizeUsername(username));
}

export function roleForUsername(username: string): UserRole {
  return isAdminUsername(username) ? "admin" : "user";
}
