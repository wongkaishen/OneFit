"use client";
import LogDietScreen from "../../mobile/screens/LogDietScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function DietPage() {
  return (
    <RequireAuth role="gym_user">
      <LogDietScreen />
    </RequireAuth>
  );
}
