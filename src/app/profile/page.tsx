"use client";
import { useRouter } from "next/navigation";
import MobileShell from "../../mobile/MobileShell";
import ProfileScreen from "../../mobile/screens/ProfileScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function ProfilePage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <MobileShell>
        <ProfileScreen onBack={() => router.back()} />
      </MobileShell>
    </RequireAuth>
  );
}
