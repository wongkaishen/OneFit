"use client";
import { useRouter } from "next/navigation";
import LogActivityScreen from "../../mobile/screens/LogActivityScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function ActivityPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <LogActivityScreen onSave={() => router.push("/milestone")} />
    </RequireAuth>
  );
}
