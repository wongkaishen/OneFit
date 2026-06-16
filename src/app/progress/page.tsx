"use client";
import UpdateProgressScreen from "../../mobile/screens/UpdateProgressScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function ProgressPage() {
  return (
    <RequireAuth role="gym_user">
      <UpdateProgressScreen />
    </RequireAuth>
  );
}
