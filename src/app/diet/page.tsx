"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import LogDietScreen from "../../mobile/screens/LogDietScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function DietPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <LogDietScreen onBack={() => router.back()} />
      </PhoneFrame>
    </RequireAuth>
  );
}
