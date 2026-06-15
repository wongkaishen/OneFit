import { request } from "./client";
import type { User, UserStatus } from "./types";

// GET /admin/users — full user list (admin only).
export const getUsers = () => request<User[]>("/admin/users");

// PATCH /admin/users/{id}/status — approve (pending→active),
// suspend (active→suspended), reinstate (suspended→active).
export const setUserStatus = (userId: string, status: UserStatus) =>
  request<User>(`/admin/users/${userId}/status`, {
    method: "PATCH",
    body: { status },
  });
