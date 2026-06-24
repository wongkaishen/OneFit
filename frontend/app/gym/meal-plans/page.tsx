"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Chip } from "@/components/ui/Chip";
import { Progress } from "@/components/ui/Progress";
import { useResource } from "@/lib/api/useResource";
import { useSession } from "@/lib/auth/session";
import { listMealPlans } from "@/lib/api/gym";
import { relativeTime } from "@/lib/format";
import type { MealPlanOut, MealPlanDay } from "@/lib/api/types";

/** Narrow the loosely-typed payload into renderable days. */
function asDays(payload: MealPlanOut["payload"]): MealPlanDay[] {
  return Array.isArray(payload) ? (payload as MealPlanDay[]) : [];
}
const mealKcal = (items: { kcal: number }[]) => items.reduce((s, it) => s + (it.kcal || 0), 0);

export default function GymMealPlansPage() {
  const { data, error, loading } = useResource<MealPlanOut[]>(listMealPlans, []);
  const { user } = useSession();
  const avatarLetter = (user?.name ?? user?.email ?? "?")[0]?.toUpperCase() ?? "?";

  const params = useSearchParams();
  const deepLinkId = params.get("plan");

  const plans = useMemo(() => data ?? [], [data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => plans.find((p) => p.plan_id === selectedId) ?? plans[0] ?? null,
    [plans, selectedId],
  );

  // Default selection: the plan from the notification deep-link, else the newest.
  useEffect(() => {
    if (plans.length === 0) return;
    if (deepLinkId && plans.some((p) => p.plan_id === deepLinkId)) setSelectedId(deepLinkId);
    else if (!selectedId) setSelectedId(plans[0].plan_id);
  }, [plans, deepLinkId, selectedId]);

  const days = selected ? asDays(selected.payload) : [];
  const [dayIdx, setDayIdx] = useState(0);
  useEffect(() => setDayIdx(0), [selected?.plan_id]);
  const day = days[dayIdx];
  const dayKcal = day ? day.meals.reduce((s, m) => s + mealKcal(m.items), 0) : 0;

  return (
    <>
      <TopBar title="Meal Plans" search="Search" avatarLetter={avatarLetter} />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <Label>Plans from your wellness specialist</Label>
          <div className="mt-1 max-w-[560px] font-sans text-[13px] leading-relaxed text-muted">
            Meal plans your specialist publishes to you appear here. Pick a plan, then a day, to
            see each meal and its calories.
          </div>

          {loading && <div className="py-8"><Label>Loading…</Label></div>}
          {error && <div className="py-8 text-[13px] text-coral">{error}</div>}
          {!loading && !error && plans.length === 0 && (
            <div className="mt-8 border border-dashed border-muted px-6 py-10 text-center">
              <div className="font-serif text-[18px] text-charcoal">No meal plans yet</div>
              <div className="mx-auto mt-2 max-w-[360px] font-sans text-[13px] text-muted">
                When your wellness specialist publishes a plan to you, it will show up here and
                you’ll get a notification.
              </div>
            </div>
          )}

          {!loading && !error && plans.length > 0 && (
            <div className="mt-7 grid gap-9" style={{ gridTemplateColumns: "300px 1fr" }}>
              {/* Plan list */}
              <div>
                <Label>Your plans · {plans.length}</Label>
                <Hairline className="mt-2" />
                {plans.map((p) => {
                  const active = selected?.plan_id === p.plan_id;
                  return (
                    <div key={p.plan_id}>
                      <div
                        onClick={() => setSelectedId(p.plan_id)}
                        className="cursor-pointer py-[14px]"
                        style={{ opacity: active ? 1 : 0.7 }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-[7px] w-[7px] flex-none rounded-full"
                            style={{ background: active ? "var(--coral)" : "var(--border)" }}
                          />
                          <span className="font-serif text-[16px] text-charcoal">{p.name}</span>
                        </div>
                        <div className="mt-1 pl-[15px] font-sans text-[11px] uppercase tracking-label text-muted">
                          {p.goal} · {p.days_per_week} days · {relativeTime(p.created_at)}
                        </div>
                      </div>
                      <Hairline />
                    </div>
                  );
                })}
              </div>

              {/* Selected plan detail */}
              <div>
                {selected && (
                  <>
                    <div className="flex items-end justify-between">
                      <div>
                        <Label>Plan</Label>
                        <div className="mt-1 font-serif text-[24px] text-charcoal">{selected.name}</div>
                      </div>
                      <div className="text-right">
                        <Label>Goal</Label>
                        <div className="mt-1 font-sans text-[14px] capitalize text-charcoal">
                          {selected.goal}
                        </div>
                      </div>
                    </div>

                    {days.length === 0 ? (
                      <div className="mt-8"><Label>This plan has no meals yet.</Label></div>
                    ) : (
                      <>
                        <div className="mt-5 flex flex-wrap gap-2">
                          {days.map((d, i) => (
                            <Chip key={d.day} active={i === dayIdx} onClick={() => setDayIdx(i)}>
                              {d.day}
                            </Chip>
                          ))}
                        </div>

                        <div className="my-5 flex items-baseline gap-2">
                          <span className="font-serif text-[34px] text-charcoal">
                            {dayKcal.toLocaleString()}
                          </span>
                          <span className="font-sans text-[12px] text-muted">kcal · {day?.day}</span>
                        </div>
                        <Progress pct={Math.min(100, (dayKcal / 1850) * 100)} />

                        <div className="mt-7">
                          {(day?.meals ?? []).map((m) => (
                            <div key={m.meal} className="mb-[14px]">
                              <div className="mb-[8px] flex items-baseline justify-between">
                                <span className="font-sans text-[14px] font-semibold text-charcoal">
                                  {m.meal}
                                </span>
                                <Label>{mealKcal(m.items)} kcal</Label>
                              </div>
                              {m.items.length === 0 ? (
                                <div className="py-2 font-sans text-[13px] text-muted">No items</div>
                              ) : (
                                m.items.map((it, i) => (
                                  <div key={`${it.name}-${i}`}>
                                    <div className="flex justify-between py-[11px]">
                                      <span className="font-sans text-[13px] text-charcoal">{it.name}</span>
                                      <span className="font-sans text-[13px] text-muted">{it.kcal}</span>
                                    </div>
                                    <Hairline />
                                  </div>
                                ))
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
