"use client";
import { useParams } from "next/navigation";
import { useResource } from "@/lib/api/useResource";
import { listMealPlans } from "@/lib/api/specialist";
import { MealPlanBuilder } from "@/components/specialist/MealPlanBuilder";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import type { MealPlanOut } from "@/lib/api/types";

export default function EditMealPlanPage() {
  const params = useParams<{ id: string }>();
  const { data, error, loading } = useResource<MealPlanOut[]>(listMealPlans, []);
  const plan = (data ?? []).find((p) => p.plan_id === params.id);

  if (loading || error || !plan) {
    return (
      <>
        <TopBar title="Plans" search="Search" avatarLetter="?" />
        <main className="flex-1 overflow-auto">
          <div className="px-5 sm:px-7 lg:px-9 py-7 lg:py-[30px]">
            {loading && <Label>Loading…</Label>}
            {error && <div className="text-[13px] text-coral">{error}</div>}
            {!loading && !error && !plan && <Label>Plan not found.</Label>}
          </div>
        </main>
      </>
    );
  }

  // Remount the builder per plan id so its initial state is seeded correctly.
  return <MealPlanBuilder key={plan.plan_id} initialPlan={plan} />;
}
