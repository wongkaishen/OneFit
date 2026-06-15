"use client";
import CalendarScreen from "../../mobile/screens/CalendarScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function CalendarPage() {
  return (
    <RequireAuth role="gym_user">
      <CalendarScreen />
    </RequireAuth>
  );
}
