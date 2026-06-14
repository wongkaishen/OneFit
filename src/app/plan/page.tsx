"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import CreatePlanScreen from "../../mobile/screens/CreatePlanScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function PlanPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <CreatePlanScreen
          onBack={() => router.back()}
          onSaved={() => router.push("/dashboard")}
        />
      </PhoneFrame>
    </RequireAuth>
  );
}
