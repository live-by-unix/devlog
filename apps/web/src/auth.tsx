import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type User } from "./api";

interface Status {
  initialized: boolean;
  needsSetup?: boolean;
  version: string;
  maintenance: boolean;
  project: { name: string; faviconPath: string; imagePath: string };
}

interface AuthCtx {
  user: User | null;
  status: Status | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, status: null, loading: true, refresh: async () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const [me, st] = await Promise.all([
        api<{ user: User | null }>("/auth/me"),
        api<Status>("/status"),
      ]);
      setUser(me.user);
      setStatus(st);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    setUser(null);
    await refresh();
  };

  useEffect(() => { void refresh(); }, []);

  return <Ctx.Provider value={{ user, status, loading, refresh, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() { return useContext(Ctx); }
