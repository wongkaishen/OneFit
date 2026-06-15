"use client";
import { useRouter } from "next/navigation";
import MobileShell from "../../mobile/MobileShell";
import LogDietScreen from "../../mobile/screens/LogDietScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function DietPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <MobileShell>
        <LogDietScreen onBack={() => router.back()} />
      </MobileShell>
    </RequireAuth>
  );
}
