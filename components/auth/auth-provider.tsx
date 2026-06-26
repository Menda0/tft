"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  clearSession,
  loadSession,
  loginRequest,
  meRequest,
  registerRequest,
  saveSession,
  type User,
} from "@/lib/auth/session";

type AuthResult =
  | { ok: true }
  | { ok: false; error: string };

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isReady: boolean;
  login: (username: string, password: string) => Promise<AuthResult>;
  signup: (username: string, password: string) => Promise<AuthResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function hydrateSession() {
      const session = loadSession();

      if (!session) {
        setIsReady(true);
        return;
      }

      const result = await meRequest(session.token);

      if (!result.ok) {
        clearSession();
        setIsReady(true);
        return;
      }

      const nextSession = { user: result.user, token: session.token };
      saveSession(nextSession);
      setUser(result.user);
      setToken(session.token);
      setIsReady(true);
    }

    void hydrateSession();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await loginRequest(username, password);

    if (!result.ok) {
      return result;
    }

    saveSession(result.session);
    setUser(result.session.user);
    setToken(result.session.token);
    return { ok: true as const };
  }, []);

  const signup = useCallback(async (username: string, password: string) => {
    const result = await registerRequest(username, password);

    if (!result.ok) {
      return result;
    }

    saveSession(result.session);
    setUser(result.session.user);
    setToken(result.session.token);
    return { ok: true as const };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, isReady, login, signup, logout }),
    [user, token, isReady, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
