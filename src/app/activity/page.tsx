"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import LogActivityScreen from "../../mobile/screens/LogActivityScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function ActivityPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <LogActivityScreen
          onBack={() => router.back()}
          onSave={() => router.push("/milestone")}
        />
      </PhoneFrame>
    </RequireAuth>
  );
}
