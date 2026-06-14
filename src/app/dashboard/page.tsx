"use client";
import PhoneFrame from "../../mobile/PhoneFrame";
import DashboardScreen from "../../mobile/screens/DashboardScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function DashboardPage() {
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <DashboardScreen />
      </PhoneFrame>
    </RequireAuth>
  );
}
