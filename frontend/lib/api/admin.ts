import { request } from "./client";
import type { AdminStats, AnnouncementIn, AnnouncementOut, AuditEntry, UserOut } from "./types";

export const listUsers = () => request<UserOut[]>("/admin/users");
export const setUserStatus = (id: string, status: string) =>
  request<UserOut>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
export const setUserRole = (id: string, role: string) =>
  request<UserOut>(`/admin/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });

export const getStats = () => request<AdminStats>("/admin/stats");
export const getAuditLog = () => request<AuditEntry[]>("/admin/audit-log");

export const listAnnouncements = () => request<AnnouncementOut[]>("/admin/announcements");
export const createAnnouncement = (body: AnnouncementIn) =>
  request<AnnouncementOut>("/admin/announcements", { method: "POST", body: JSON.stringify(body) });
