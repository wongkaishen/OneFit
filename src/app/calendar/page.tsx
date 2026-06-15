"use client";
import { useRouter } from "next/navigation";
import MobileShell from "../../mobile/MobileShell";
import CalendarScreen from "../../mobile/screens/CalendarScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function CalendarPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <MobileShell>
        <CalendarScreen onBack={() => router.back()} />
      </MobileShell>
    </RequireAuth>
  );
}
