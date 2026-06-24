"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { useResource } from "@/lib/api/useResource";
import { useSession } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/client";
import {
  listClients,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
} from "@/lib/api/specialist";
import type {
  ClientSummary,
  MealPlanDay,
  MealPlanOut,
  MealPlanStatus,
} from "@/lib/api/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
type Item = { name: string; kcal: number };
type DayPlan = Record<string, Item[]>;

const emptyPlan = (): Record<string, DayPlan> =>
  Object.fromEntries(DAYS.map((d) => [d, Object.fromEntries(MEALS.map((m) => [m, [] as Item[]]))]));

/** Turn the persisted payload back into the editable day/meal grid. */
function parsePayload(payload: unknown): Record<string, DayPlan> {
  const base = emptyPlan();
  if (!Array.isArray(payload)) return base;
  for (const day of payload as MealPlanDay[]) {
    if (!base[day.day]) continue;
    for (const meal of day.meals ?? []) {
      if (base[day.day][meal.meal]) base[day.day][meal.meal] = (meal.items ?? []) as Item[];
    }
  }
  return base;
}

export function MealPlanBuilder({ initialPlan }: { initialPlan?: MealPlanOut }) {
  const router = useRouter();
  const clients = useResource<ClientSummary[]>(listClients, []);
  const { user } = useSession();
  const avatarLetter = (user?.name ?? user?.email ?? "?")[0]?.toUpperCase() ?? "?";

  const [planId, setPlanId] = useState<string | null>(initialPlan?.plan_id ?? null);
  const [status, setStatus] = useState<MealPlanStatus>(initialPlan?.status ?? "draft");
  const [name, setName] = useState(initialPlan?.name ?? "Lean & Steady · Week 1");
  const [goal, setGoal] = useState(initialPlan?.goal ?? "maintain");
  const [clientId, setClientId] = useState<string>(initialPlan?.client_id ?? "");
  const [day, setDay] = useState("Mon");
  const [plan, setPlan] = useState<Record<string, DayPlan>>(() => parsePayload(initialPlan?.payload));

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const published = status === "published";

  const dayKcal = useMemo(
    () => MEALS.reduce((sum, m) => sum + (plan[day][m] ?? []).reduce((s, it) => s + it.kcal, 0), 0),
    [plan, day],
  );

  const addItem = (meal: string) => {
    const nameInput = window.prompt("Food name?");
    if (!nameInput) return;
    const kcalInput = Number(window.prompt("Calories?") ?? "0");
    setPlan((p) => ({
      ...p,
      [day]: { ...p[day], [meal]: [...p[day][meal], { name: nameInput, kcal: kcalInput || 0 }] },
    }));
  };

  const removeItem = (meal: string, idx: number) => {
    setPlan((p) => ({
      ...p,
      [day]: { ...p[day], [meal]: p[day][meal].filter((_, i) => i !== idx) },
    }));
  };

  const buildPayload = (): MealPlanDay[] =>
    DAYS.map((d) => ({ day: d, meals: MEALS.map((m) => ({ meal: m, items: plan[d][m] })) }));

  // Save without publishing: create a draft the first time, then PATCH in place.
  const saveDraft = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const payload = buildPayload();
      if (planId) {
        await updateMealPlan(planId, { name, goal, days_per_week: 7, payload, client_id: clientId || null });
        setMsg("Changes saved.");
      } else {
        const created = await createMealPlan({
          name, goal, days_per_week: 7, payload, client_id: clientId || null, status: "draft",
        });
        setPlanId(created.plan_id);
        setStatus("draft");
        // Reflect the draft id in the URL so a refresh reopens the same draft.
        router.replace(`/specialist/plans/${created.plan_id}`);
        setMsg("Draft saved.");
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (!clientId) {
        setErr("Select a client to publish to.");
        return;
      }
      const payload = buildPayload();
      if (planId) {
        await updateMealPlan(planId, { name, goal, days_per_week: 7, payload, client_id: clientId, status: "published" });
      } else {
        const created = await createMealPlan({
          name, goal, days_per_week: 7, payload, client_id: clientId, status: "published",
        });
        setPlanId(created.plan_id);
        router.replace(`/specialist/plans/${created.plan_id}`);
      }
      setStatus("published");
      setMsg("Plan published — client notified.");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to publish");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!planId) {
      router.push("/specialist/plans");
      return;
    }
    if (!window.confirm("Delete this meal plan? This cannot be undone.")) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteMealPlan(planId);
      router.push("/specialist/plans");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to delete");
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Plans" search="Search foods" avatarLetter={avatarLetter} />
      <main className="flex-1 overflow-auto">
        <div className="flex items-center justify-between border-b border-border px-9 py-[22px]">
          <div>
            <div className="flex items-center gap-3">
              <Label>{planId ? "Edit meal plan" : "New meal plan"}</Label>
              <Badge tone={published ? "live" : "draft"}>{published ? "Published" : "Draft"}</Badge>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-[6px] block w-[420px] border-0 bg-transparent font-serif text-[24px] text-charcoal outline-none"
            />
          </div>
          <div className="flex items-center gap-[10px]">
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="h-[34px] border border-border bg-white px-2 font-sans text-[12px] text-charcoal"
            >
              {["maintain", "lose", "gain"].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={published}
              className="h-[34px] border border-border bg-white px-2 font-sans text-[12px] text-charcoal disabled:opacity-60"
            >
              <option value="">Template (no client)</option>
              {(clients.data ?? []).map((c) => (
                <option key={c.user_id} value={c.user_id}>{c.name ?? c.email}</option>
              ))}
            </select>
            {published ? (
              <Button size="sm" onClick={saveDraft} disabled={busy}>Save changes</Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={saveDraft} disabled={busy}>Save draft</Button>
                <Button size="sm" onClick={publish} disabled={busy}>Publish plan</Button>
              </>
            )}
            {planId && (
              <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>Delete</Button>
            )}
          </div>
        </div>

        <div className="flex gap-2 px-9 pt-5">
          {DAYS.map((d) => (
            <Chip key={d} active={day === d} onClick={() => setDay(d)}>{d}</Chip>
          ))}
        </div>

        <div className="grid px-9 py-[26px]" style={{ gridTemplateColumns: "1fr 320px" }}>
          <div className="pr-10">
            {MEALS.map((meal) => {
              const items = plan[day][meal];
              const kcal = items.reduce((s, it) => s + it.kcal, 0);
              return (
                <div key={meal} className="mb-[14px]">
                  <div className="mb-[10px] flex items-baseline justify-between">
                    <span className="font-sans text-[14px] font-semibold text-charcoal">{meal}</span>
                    <Label>{kcal} kcal</Label>
                  </div>
                  {items.map((it, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between py-[11px]">
                        <span className="font-sans text-[13px] text-charcoal">{it.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-sans text-[13px] text-muted">{it.kcal}</span>
                          <button
                            type="button"
                            onClick={() => removeItem(meal, i)}
                            className="font-sans text-[14px] leading-none text-muted hover:text-coral"
                            aria-label="Remove item"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <Hairline />
                    </div>
                  ))}
                  <div
                    onClick={() => addItem(meal)}
                    className="mt-3 flex h-12 cursor-pointer items-center justify-center gap-[10px] border border-dashed border-muted"
                  >
                    <span className="text-[13px] text-subtle">+</span>
                    <span className="font-sans text-[11px] uppercase tracking-wider text-subtle">Add food</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-l border-border pl-8">
            <Label>Live summary · {day}</Label>
            <div className="my-[14px] mb-[6px] flex items-baseline gap-2">
              <span className="font-serif text-[38px] text-charcoal">{dayKcal.toLocaleString()}</span>
              <span className="font-sans text-[12px] text-muted">kcal</span>
            </div>
            <Progress pct={Math.min(100, (dayKcal / 1850) * 100)} />
            <Hairline className="my-5" />
            <div className="flex justify-between">
              <Label>Meals</Label>
              <span className="font-sans text-[13px] text-charcoal">
                {MEALS.filter((m) => plan[day][m].length > 0).length}
              </span>
            </div>
            <div className="mt-4 font-sans text-[12px] leading-relaxed text-muted">
              {published
                ? "This plan is live for the client. Saving updates it in place — no new notification is sent."
                : "Save a draft to keep editing, or publish to a client to send it and notify them."}
            </div>
            {msg && <div className="mt-4 font-sans text-[12px] text-good">{msg}</div>}
            {err && <div className="mt-4 font-sans text-[12px] text-coral">{err}</div>}
          </div>
        </div>
      </main>
    </>
  );
}
