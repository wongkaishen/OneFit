"use client";
import { useRouter } from "next/navigation";
import MobileShell from "../../mobile/MobileShell";
import LogActivityScreen from "../../mobile/screens/LogActivityScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function ActivityPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <MobileShell>
        <LogActivityScreen
          onBack={() => router.back()}
          onSave={() => router.push("/milestone")}
        />
      </MobileShell>
    </RequireAuth>
  );
}
