"use client";
import { useRouter } from "next/navigation";
import CreateMealPlan from "../../../web/screens/CreateMealPlan";
import { RequireAuth } from "../../../auth/RequireAuth";
import { SPECIALIST_ROUTES } from "../../../web/navRoutes";

export default function SpecialistPlansPage() {
  const router = useRouter();
  const onNav = (label: string) => {
    const path = SPECIALIST_ROUTES[label];
    if (path) router.push(path);
  };

  return (
    <RequireAuth role="wellness_specialist">
      <CreateMealPlan onBack={() => router.push("/specialist/clients")} onNav={onNav} />
    </RequireAuth>
  );
}
