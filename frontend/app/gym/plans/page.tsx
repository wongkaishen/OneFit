"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { listPlans, createPlan, listMealPlans } from "@/lib/api/gym";
import { shortDate } from "@/lib/format";
import { MealPlanCard } from "@/components/MealPlanCard";
import type { WorkoutPlan, MealPlanOut } from "@/lib/api/types";

export default function GymPlansPage() {
  const { data, error, loading, setData } = useResource<WorkoutPlan[]>(listPlans, []);
  const mealPlans = useResource<MealPlanOut[]>(listMealPlans, []);
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;
    setFormErr(null);
    setBusy(true);
    try {
      const plan = await createPlan(goal.trim());
      setData((prev) => [plan, ...(prev ?? [])]);
      setGoal("");
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : "Failed to create plan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Workout plans" search="Search" avatarLetter="G" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <Label>Meal plan from your specialist</Label>
          <div className="mt-3">
            {mealPlans.loading && <Label>Loading…</Label>}
            {mealPlans.error && <div className="text-[13px] text-coral">{mealPlans.error}</div>}
            {!mealPlans.loading && (mealPlans.data ?? []).length === 0 && (
              <div className="mb-8 border border-border bg-white p-5">
                <Label>No meal plan from your specialist yet.</Label>
              </div>
            )}
            {(mealPlans.data ?? []).map((p) => (
              <MealPlanCard key={p.plan_id} plan={p} />
            ))}
          </div>

          <Label>Create a plan</Label>
          <form onSubmit={create} className="mt-4 flex items-end gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <Label>Goal</Label>
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Build strength, 3x/week"
                className="h-[42px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
              />
            </div>
            <Button type="submit" variant="dark" disabled={busy || !goal.trim()}>
              {busy ? "Creating…" : "Create plan"}
            </Button>
          </form>
          {formErr && <div className="mt-2 text-[13px] text-coral">{formErr}</div>}

          <div className="mt-9">
            <Label>Your plans</Label>
            <Hairline className="mt-2" />
            {loading && <div className="py-6"><Label>Loading…</Label></div>}
            {error && <div className="py-6 text-[13px] text-coral">{error}</div>}
            {!loading && (data ?? []).length === 0 && (
              <div className="py-6"><Label>No plans yet</Label></div>
            )}
            {(data ?? []).map((p) => (
              <div key={p.plan_id}>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <div className="font-sans text-[14px] text-charcoal">{p.goal}</div>
                    <div className="mt-1 font-sans text-[11px] text-muted">
                      Created {shortDate(p.created_at)} · via {p.generated_by}
                    </div>
                  </div>
                  <Badge tone={p.status === "active" ? "good" : "neutral"}>{p.status}</Badge>
                </div>
                <Hairline />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
