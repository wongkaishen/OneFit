"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import * as authApi from "../api/auth";
import { setDemoMode, setDemoRole, setToken } from "../api/client";
import type { User } from "../api/types";

// Maps ?demo=<value> to the role demo mode should impersonate.
const DEMO_ROLE_ALIAS: Record<string, string> = {
  "1": "gym_user",
  gym: "gym_user",
  gym_user: "gym_user",
  specialist: "wellness_specialist",
  wellness_specialist: "wellness_specialist",
  admin: "admin",
};

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {
    throw new Error("AuthProvider missing");
  },
  logout: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const demo = params.get("demo");
      if (demo === "0") {
        setDemoMode(false);
        setDemoRole(null);
        setToken(null);
      } else if (demo && DEMO_ROLE_ALIAS[demo]) {
        setDemoMode(true);
        setDemoRole(DEMO_ROLE_ALIAS[demo]);
        setToken("demo-jwt-token"); // ensure the client attaches a Bearer header
      }
    }
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
