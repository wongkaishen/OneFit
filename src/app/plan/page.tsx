"use client";
import { useRouter } from "next/navigation";
import CreatePlanScreen from "../../mobile/screens/CreatePlanScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function PlanPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <CreatePlanScreen onSaved={() => router.push("/dashboard")} />
    </RequireAuth>
  );
}
