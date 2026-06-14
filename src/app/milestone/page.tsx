"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import MilestoneScreen from "../../mobile/screens/MilestoneScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function MilestonePage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame bg="var(--coral)">
        <MilestoneScreen onShare={() => router.push("/dashboard")} />
      </PhoneFrame>
    </RequireAuth>
  );
}
