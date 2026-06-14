"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import ProfileScreen from "../../mobile/screens/ProfileScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function ProfilePage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <ProfileScreen onBack={() => router.back()} />
      </PhoneFrame>
    </RequireAuth>
  );
}
