const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

function token(): string | null {
  if (typeof window !== "undefined") {
    const ls = window.localStorage.getItem("onefit-jwt");
    if (ls) return ls;
  }
  return process.env.NEXT_PUBLIC_DEV_JWT ?? null;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  const t = token();
  if (t) headers.set("Authorization", `Bearer ${t}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers, cache: "no-store" });

  if (res.status === 501) throw new ApiError(501, "Not implemented yet");
  if (!res.ok) {
    let msg: string = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) msg = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
