"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { useResource } from "@/lib/api/useResource";
import { useSession } from "@/lib/auth/session";
import { listMealPlans } from "@/lib/api/gym";
import { relativeTime } from "@/lib/format";
import type { MealPlanOut, MealPlanDay } from "@/lib/api/types";

/** Narrow the loosely-typed payload into renderable days.
 * Only keeps well-formed day objects (an object with a `meals` array); legacy or
 * malformed rows (e.g. payload `["string"]`) are dropped so the UI shows the
 * empty state instead of crashing. */
function asDays(payload: MealPlanOut["payload"]): MealPlanDay[] {
  if (!Array.isArray(payload)) return [];
  return (payload as unknown[]).filter(
    (d): d is MealPlanDay =>
      typeof d === "object" && d !== null && Array.isArray((d as MealPlanDay).meals),
  );
}
const mealKcal = (items: { kcal: number }[] | undefined) =>
  (items ?? []).reduce((s, it) => s + (it.kcal || 0), 0);

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
  const dayKcal = (day?.meals ?? []).reduce((s, m) => s + mealKcal(m.items ?? []), 0);

  return (
    <>
      <TopBar title="Meal Plans" search="Search" avatarLetter={avatarLetter} />
      <PageBody>
        <PageHeader eyebrow="Plans from your wellness specialist">
          Meal plans your specialist publishes to you appear here. Pick a plan, then a day, to
          see each meal and its calories.
        </PageHeader>

          {loading && <div className="py-8"><Label>Loading…</Label></div>}
          {error && <div className="py-8 text-[13px] text-coral">{error}</div>}
          {!loading && !error && plans.length === 0 && (
            <EmptyState title="No meal plans yet" icon="meals">
              When your wellness specialist publishes a plan to you, it will show up here and
              you’ll get a notification.
            </EmptyState>
          )}

          {!loading && !error && plans.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
              {/* Plan list */}
              <Card padded={false} className="h-fit p-5">
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
              </Card>

              {/* Selected plan detail */}
              <Card className="min-w-0">
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
                              {(m.items ?? []).length === 0 ? (
                                <div className="py-2 font-sans text-[13px] text-muted">No items</div>
                              ) : (
                                (m.items ?? []).map((it, i) => (
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
              </Card>
            </div>
          )}
      </PageBody>
    </>
  );
}
