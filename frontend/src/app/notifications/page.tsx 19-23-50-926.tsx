"use client";
import NotificationsScreen from "../../mobile/screens/NotificationsScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsScreen />
    </RequireAuth>
  );
}
