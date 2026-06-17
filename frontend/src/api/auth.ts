import { request, setToken } from "./client";
import type { AuthResponse, User } from "./types";

export async function register(payload: {
  name: string;
  email: string;
  password: string;
  role: "gym_user" | "wellness_specialist" | "admin";
}): Promise<User> {
  return request<User>("/auth/register", { method: "POST", body: payload, auth: false });
}

export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  const res = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
  });
  setToken(res.access_token);
  return res;
}

export async function me(): Promise<User> {
  return request<User>("/auth/me");
}

export function logout() {
  setToken(null);
}
