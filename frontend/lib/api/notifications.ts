import { request } from "./client";
import type { NotificationOut } from "./types";

// Shared by every authenticated role. Admin announcements also land here.
export const listNotifications = (unreadOnly = false) =>
  request<NotificationOut[]>(`/notifications${unreadOnly ? "?unread_only=true" : ""}`);

export const markNotificationRead = (id: string) =>
  request<NotificationOut>(`/notifications/${id}/read`, { method: "PATCH" });
