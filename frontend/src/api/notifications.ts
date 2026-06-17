import { request } from "./client";
import type { Notification } from "./types";

export const listNotifications = () => request<Notification[]>("/notifications");
export const markRead = (id: string) =>
  request<void>(`/notifications/${id}/read`, { method: "PATCH" });
