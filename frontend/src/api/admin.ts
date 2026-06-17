import { request } from "./client";
import type {
  AdminStats,
  Announcement,
  AnnouncementAudience,
  AuditEntry,
  User,
  UserRole,
  UserStatus,
} from "./types";

// GET /admin/users — full user list (admin only).
export const getUsers = () => request<User[]>("/admin/users");

// PATCH /admin/users/{id}/status — approve (pending→active),
// suspend (active→suspended), reinstate (suspended→active).
export const setUserStatus = (userId: string, status: UserStatus) =>
  request<User>(`/admin/users/${userId}/status`, {
    method: "PATCH",
    body: { status },
  });

// PATCH /admin/users/{id}/role — promote/demote between actor roles.
export const setUserRole = (userId: string, role: UserRole) =>
  request<User>(`/admin/users/${userId}/role`, {
    method: "PATCH",
    body: { role },
  });

export const getStats = () => request<AdminStats>("/admin/stats");

export const getAuditLog = (limit = 20) =>
  request<AuditEntry[]>(`/admin/audit-log?limit=${limit}`);

export const listAnnouncements = () =>
  request<Announcement[]>("/admin/announcements");

export const createAnnouncement = (body: {
  title: string;
  body: string;
  target_audience: AnnouncementAudience;
}) => request<Announcement>("/admin/announcements", { method: "POST", body });
