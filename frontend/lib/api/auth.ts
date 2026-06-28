import { request } from "./client";
import type { AuthTokens, CurrentUser, MfaEnrollOut, RegisterIn } from "./types";

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

export const mfaEnroll = () => request<MfaEnrollOut>("/auth/mfa/enroll", { method: "POST" });
export const mfaVerify = (factorId: string, code: string) =>
  request<AuthTokens>("/auth/mfa/verify", { method: "POST", body: JSON.stringify({ factor_id: factorId, code }) });
