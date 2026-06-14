"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import DashboardScreen from "../../mobile/screens/DashboardScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function DashboardPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <DashboardScreen
          onTab={(t) => {
            if (t === "Train") router.push("/activity");
            if (t === "Eat") router.push("/diet");
          }}
        />
      </PhoneFrame>
    </RequireAuth>
  );
}
