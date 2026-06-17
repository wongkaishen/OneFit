"use client";
import { useRouter } from "next/navigation";
import MobileShell from "../../mobile/MobileShell";
import MilestoneScreen from "../../mobile/screens/MilestoneScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function MilestonePage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <MobileShell bg="var(--coral)">
        <MilestoneScreen onShare={() => router.push("/dashboard")} />
      </MobileShell>
    </RequireAuth>
  );
}
