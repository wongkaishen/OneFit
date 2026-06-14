"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import CalendarScreen from "../../mobile/screens/CalendarScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function CalendarPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <CalendarScreen onBack={() => router.back()} />
      </PhoneFrame>
    </RequireAuth>
  );
}
