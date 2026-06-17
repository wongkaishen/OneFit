"use client";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { useResource } from "@/lib/api/useResource";
import { listClients, createMealPlan } from "@/lib/api/specialist";
import type { ClientSummary } from "@/lib/api/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
type Item = { name: string; kcal: number };
type DayPlan = Record<string, Item[]>;

export default function CreateMealPlanPage() {
  const clients = useResource<ClientSummary[]>(listClients, []);
  const [name, setName] = useState("Lean & Steady · Week 1");
  const [goal, setGoal] = useState("maintain");
  const [day, setDay] = useState("Mon");
  const [plan, setPlan] = useState<Record<string, DayPlan>>(() =>
    Object.fromEntries(DAYS.map((d) => [d, Object.fromEntries(MEALS.map((m) => [m, []]))]))
  );
  const [clientId, setClientId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const dayKcal = useMemo(
    () =>
      MEALS.reduce(
        (sum, m) => sum + (plan[day][m] ?? []).reduce((s, it) => s + it.kcal, 0),
        0
      ),
    [plan, day]
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

  const buildPayload = () =>
    DAYS.map((d) => ({
      day: d,
      meals: MEALS.map((m) => ({ meal: m, items: plan[d][m] })),
    }));

  const save = async (publish: boolean) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (publish && !clientId) {
        setErr("Select a client to publish, or use Save draft.");
        setBusy(false);
        return;
      }
      await createMealPlan({
        name,
        goal,
        days_per_week: 7,
        payload: buildPayload(),
        client_id: publish ? clientId : null,
      });
      setMsg(publish ? "Plan published — client notified." : "Draft saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Plans" search="Search foods" avatarLetter="J" />
      <main className="flex-1 overflow-auto">
        <div className="flex items-center justify-between border-b border-border px-9 py-[22px]">
          <div>
            <Label>New meal plan · draft</Label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-[6px] block w-[420px] border-0 bg-transparent font-serif text-[24px] text-charcoal outline-none"
            />
          </div>
          <div className="flex items-center gap-[10px]">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-[34px] border border-border bg-white px-2 font-sans text-[12px] text-charcoal"
            >
              <option value="">Template (no client)</option>
              {(clients.data ?? []).map((c) => (
                <option key={c.user_id} value={c.user_id}>{c.name ?? c.email}</option>
              ))}
            </select>
            <Button variant="ghost" size="sm" onClick={() => save(false)} disabled={busy}>Save draft</Button>
            <Button size="sm" onClick={() => save(true)} disabled={busy}>Publish plan</Button>
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
                      <div className="flex justify-between py-[11px]">
                        <span className="font-sans text-[13px] text-charcoal">{it.name}</span>
                        <span className="font-sans text-[13px] text-muted">{it.kcal}</span>
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
            {msg && <div className="mt-4 font-sans text-[12px] text-good">{msg}</div>}
            {err && <div className="mt-4 font-sans text-[12px] text-coral">{err}</div>}
          </div>
        </div>
      </main>
    </>
  );
}
