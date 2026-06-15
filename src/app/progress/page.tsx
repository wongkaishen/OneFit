"use client";
import { useRouter } from "next/navigation";
import MobileShell from "../../mobile/MobileShell";
import UpdateProgressScreen from "../../mobile/screens/UpdateProgressScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function ProgressPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <MobileShell>
        <UpdateProgressScreen onBack={() => router.back()} />
      </MobileShell>
    </RequireAuth>
  );
}
