export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateCredentials(
  username: string,
  password: string,
  mode: "login" | "register",
): string | null {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    return mode === "register" ? "Choose a username." : "Enter a username.";
  }

  if (normalizedUsername.length < 3) {
    return "Username must be at least 3 characters.";
  }

  if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
    return "Username can only use letters, numbers, and underscores.";
  }

  if (!password.trim()) {
    return "Enter a password.";
  }

  if (password.length < 4) {
    return "Password must be at least 4 characters.";
  }

  return null;
}
