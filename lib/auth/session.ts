import type { UserRole } from "@/lib/auth/admin";

export type User = {
  id: string;
  username: string;
  role: UserRole;
};

export type Session = {
  user: User;
  token: string;
};

const STORAGE_KEY = "fakex-session";

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<Session> & {
      user?: Partial<User> & { handle?: string };
      token?: string;
    };

    if (parsed.token && parsed.user?.id && parsed.user.username) {
      return {
        token: parsed.token,
        user: {
          id: parsed.user.id,
          username: parsed.user.username,
          role: parsed.user.role === "admin" ? "admin" : "user",
        },
      };
    }

    if (parsed.token && parsed.user?.handle) {
      return {
        token: parsed.token,
        user: {
          id: parsed.user.id ?? parsed.user.handle,
          username: parsed.user.handle,
          role: "user",
        },
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

async function parseAuthResponse(response: Response): Promise<
  | { ok: true; user: User; token: string }
  | { ok: false; error: string }
> {
  const data = (await response.json()) as {
    user?: User;
    token?: string;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Request failed." };
  }

  if (!data.user || !data.token) {
    return { ok: false, error: "Invalid server response." };
  }

  return { ok: true, user: data.user, token: data.token };
}

export async function registerRequest(
  username: string,
  password: string,
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const result = await parseAuthResponse(response);

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    session: { user: result.user, token: result.token },
  };
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const result = await parseAuthResponse(response);

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    session: { user: result.user, token: result.token },
  };
}

export async function meRequest(
  token: string,
): Promise<{ ok: true; user: User } | { ok: false }> {
  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return { ok: false };
  }

  const data = (await response.json()) as { user?: User };

  if (!data.user) {
    return { ok: false };
  }

  return { ok: true, user: data.user };
}
