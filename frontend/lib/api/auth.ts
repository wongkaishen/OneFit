import { request } from "./client";
import type { AuthTokens, CurrentUser, RegisterIn } from "./types";

export const login = (email: string, password: string) =>
  request<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const register = (body: RegisterIn) =>
  request<unknown>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const me = () => request<CurrentUser>("/auth/me");
