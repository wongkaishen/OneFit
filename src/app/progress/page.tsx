"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import UpdateProgressScreen from "../../mobile/screens/UpdateProgressScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function ProgressPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <UpdateProgressScreen onBack={() => router.back()} />
      </PhoneFrame>
    </RequireAuth>
  );
}
