import type { ApiError } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const TOKEN_KEY = "onefit-jwt";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

interface RequestOpts {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;          // default true; pass false for /auth/login etc.
}

export async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 501) {
    // AI endpoints currently 501; callers should catch and show "coming soon"
    const err: ApiError = { status: 501, detail: "Not implemented yet" };
    throw err;
  }

  if (!res.ok) {
    let detail: string = res.statusText;
    try {
      const json = await res.json();
      const raw = json.detail;
      if (Array.isArray(raw)) {
        // FastAPI 422: [{loc:[...], msg:"...", ...}]
        detail = raw
          .map((e: { loc?: unknown[]; msg?: string }) => {
            const field = Array.isArray(e.loc) ? e.loc.slice(1).join(".") : "";
            return field ? `${field}: ${e.msg}` : e.msg ?? "";
          })
          .filter(Boolean)
          .join("; ");
      } else if (typeof raw === "string") {
        detail = raw;
      }
    } catch {}
    const err: ApiError = { status: res.status, detail };
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
