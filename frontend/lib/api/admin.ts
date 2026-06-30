import { request } from "./client";
import type {
  AdminStats, AnnouncementIn, AnnouncementOut, AuditEntry, LoginEventOut, UserOut,
  ProgramOut, AdminUserActivity, AdminCommunityGroup, AdminCommunityPost,
  AdminPlanOut, AdminPlanDetail, ReportOut,
} from "./types";

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

// Direct message to a single user. Broadcasts go through Announcements.
export const sendNotification = (body: {
  message: string; user_id: string; title?: string;
}) => request<unknown>("/admin/notifications", { method: "POST", body: JSON.stringify(body) });

export const getUserActivity = (id: string) =>
  request<AdminUserActivity>(`/admin/users/${id}/activity`);

export const getSpecialistCredential = (id: string) =>
  request<{ url: string }>(`/admin/specialists/${id}/credential`);

export const listLoginEvents = (failuresOnly = false, hours = 24) =>
  request<LoginEventOut[]>(`/admin/login-events?failures_only=${failuresOnly}&hours=${hours}`);

// --- Community oversight ---
export const adminListGroups = () =>
  request<AdminCommunityGroup[]>("/admin/community/groups");
export const adminListGroupPosts = (groupId: string) =>
  request<AdminCommunityPost[]>(`/admin/community/groups/${groupId}/posts`);
export const adminUpdatePost = (postId: string, body: { content?: string; status?: string }) =>
  request<AdminCommunityPost>(`/admin/community/posts/${postId}`, {
    method: "PATCH", body: JSON.stringify(body),
  });
export const adminDeletePost = (postId: string) =>
  request<{ deleted: boolean; post_id: string }>(`/admin/community/posts/${postId}`, {
    method: "DELETE",
  });

// --- Reports queue (issue #3 P1) ---
export const adminListReports = (statusFilter = "open") =>
  request<ReportOut[]>(`/admin/reports?status_filter=${statusFilter}`);
export const adminResolveReport = (
  reportId: string,
  action: "dismiss" | "remove_post" | "suspend_user",
  note?: string,
) =>
  request<ReportOut>(`/admin/reports/${reportId}/resolve`, {
    method: "POST", body: JSON.stringify({ action, note }),
  });

// --- Program/plan management ---
export const adminListAllPrograms = (statusFilter?: string) =>
  request<AdminPlanOut[]>(
    `/admin/programs/all${statusFilter ? `?status_filter=${statusFilter}` : ""}`,
  );
export const adminProgramDetail = (planId: string) =>
  request<AdminPlanDetail>(`/admin/programs/${planId}/detail`);
export const adminUpdateProgram = (planId: string, body: { goal?: string; status?: string }) =>
  request<AdminPlanOut>(`/admin/programs/${planId}`, {
    method: "PATCH", body: JSON.stringify(body),
  });
