"use client";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { me as fetchMe } from "@/lib/api/auth";
import type { CurrentUser, Role } from "@/lib/api/types";

const TOKEN_KEY = "onefit-jwt";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}

/** Landing route for an active account of the given role. */
export function roleHome(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "wellness_specialist":
      return "/specialist/clients";
    default:
      return "/gym/dashboard";
  }
}

interface SessionState {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
}

/**
 * Resolve the signed-in user from the stored token via /auth/me.
 * No token → { user: null, loading: false }. Used by AuthGate and the TopBar.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let alive = true;
    if (!getToken()) {
      setState({ user: null, loading: false, error: null });
      return;
    }
    fetchMe()
      .then((u) => alive && setState({ user: u, loading: false, error: null }))
      .catch((e: unknown) => {
        if (!alive) return;
        // Stale/invalid token — drop it so the guard sends the user to /login.
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) clearToken();
        setState({
          user: null,
          loading: false,
          error: e instanceof ApiError ? e.message : "Session check failed",
        });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
