import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { shortDate } from "@/lib/format";
import type { MealPlanOut } from "@/lib/api/types";

// Shape the specialist's CreateMealPlan screen saves into `payload`.
type PlanItem = { name: string; kcal: number };
type PlanDay = { day: string; meals: { meal: string; items: PlanItem[] }[] };

export function MealPlanCard({ plan }: { plan: MealPlanOut }) {
  const days = (Array.isArray(plan.payload) ? plan.payload : []) as PlanDay[];
  // Only show days that actually have food in them.
  const filled = days.filter((d) => d.meals?.some((m) => (m.items?.length ?? 0) > 0));
  return (
    <div className="mb-5 border border-border bg-paper p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-serif text-[19px] text-charcoal">{plan.name}</div>
        <Badge tone="good">{plan.goal}</Badge>
      </div>
      <div className="mt-1 font-sans text-[11px] text-muted">
        From your specialist · {shortDate(plan.created_at)}
      </div>
      <Hairline className="my-4" />
      {filled.length === 0 && <Label>No meals in this plan yet.</Label>}
      {filled.map((d) => (
        <div key={d.day} className="mb-4">
          <Label>{d.day}</Label>
          <div className="mt-2">
            {d.meals
              .filter((m) => (m.items?.length ?? 0) > 0)
              .map((m) => (
                <div key={m.meal} className="mb-2">
                  <div className="font-sans text-[12px] font-semibold text-charcoal">{m.meal}</div>
                  {m.items.map((it, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span className="font-sans text-[13px] text-charcoal">{it.name}</span>
                      <span className="font-sans text-[13px] text-muted">{it.kcal} kcal</span>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
