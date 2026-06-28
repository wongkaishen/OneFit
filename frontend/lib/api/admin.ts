import { request } from "./client";
import type { AdminStats, AnnouncementIn, AnnouncementOut, AuditEntry, UserOut, ProgramOut, AdminUserActivity } from "./types";

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

export const listRegistrations = () => request<UserOut[]>("/admin/registrations");
export const approveRegistration = (id: string) =>
  request<UserOut>(`/admin/registrations/${id}/approve`, { method: "POST" });
export const rejectRegistration = (id: string, reason: string) =>
  request<UserOut>(`/admin/registrations/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });

export const listPrograms = (inactiveDays = 30) =>
  request<ProgramOut[]>(`/admin/programs?inactive_days=${inactiveDays}`);
export const removeProgram = (id: string) =>
  request<{ plan_id: string; status: string; sessions_detached: number }>(
    `/admin/programs/${id}/remove`, { method: "POST" });

export const sendNotification = (body: {
  message: string; audience: string; user_id?: string; title?: string;
}) => request<unknown>("/admin/notifications", { method: "POST", body: JSON.stringify(body) });

export const getUserActivity = (id: string) =>
  request<AdminUserActivity>(`/admin/users/${id}/activity`);
