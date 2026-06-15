"use client";
import ProfileScreen from "../../mobile/screens/ProfileScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function ProfilePage() {
  return (
    <RequireAuth role="gym_user">
      <ProfileScreen />
    </RequireAuth>
  );
}
