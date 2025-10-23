import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "../lib/api";

type PublicUser = { id: number; email: string; name: string; role?: string };

type AuthContextType = {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize: check if user is already logged in (cookie-based session)
  useEffect(() => {
    getJSON<PublicUser>("/auth/me")
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    await postJSON("/auth/login", { email, password });
    const me = await getJSON<PublicUser>("/auth/me");
    setUser(me);
  };

  const signup = async (email: string, password: string, name?: string) => {
    await postJSON("/auth/signup", { email, password, name });
    const me = await getJSON<PublicUser>("/auth/me");
    setUser(me);
  };

  const logout = async () => {
    try {
      await postJSON("/auth/logout");
    } catch {}
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, signup, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
