"use client";
import { useRouter } from "next/navigation";
import MobileShell from "../../mobile/MobileShell";
import CreatePlanScreen from "../../mobile/screens/CreatePlanScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function PlanPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <MobileShell>
        <CreatePlanScreen
          onBack={() => router.back()}
          onSaved={() => router.push("/dashboard")}
        />
      </MobileShell>
    </RequireAuth>
  );
}
