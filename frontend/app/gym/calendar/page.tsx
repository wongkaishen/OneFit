"use client";
import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { listSessions, scheduleSession, listPlans } from "@/lib/api/gym";
import type { WorkoutSession, WorkoutPlan } from "@/lib/api/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function GymCalendarPage() {
  const sessions = useResource<WorkoutSession[]>(listSessions, []);
  const plans = useResource<WorkoutPlan[]>(listPlans, []);

  const [planId, setPlanId] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("18:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const planOptions = plans.data ?? [];
  const effectivePlan = planId || planOptions[0]?.plan_id || "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(null);
    if (!effectivePlan) {
      setError("Create a workout plan first.");
      return;
    }
    setBusy(true);
    try {
      const session = await scheduleSession({
        plan_id: effectivePlan,
        scheduled_date: date,
        scheduled_time: time.length === 5 ? `${time}:00` : time,
      });
      sessions.setData((prev) => [...(prev ?? []), session]);
      setSaved("Session scheduled.");
    } catch (err) {
      // The backend returns 409 when the slot clashes with an existing session.
      if (err instanceof ApiError && err.status === 409) {
        setError("That time slot is taken — pick another.");
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to schedule");
      }
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...(sessions.data ?? [])].sort((a, b) =>
    `${a.scheduled_date}T${a.scheduled_time}`.localeCompare(`${b.scheduled_date}T${b.scheduled_time}`),
  );

  return (
    <>
      <TopBar title="Calendar" search="Search" avatarLetter="G" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <Label>Schedule a workout</Label>

          {planOptions.length === 0 && !plans.loading && (
            <div className="mt-3 text-[13px] text-muted">
              You need a plan first.{" "}
              <Link href="/gym/plans" className="text-charcoal underline">Create one</Link>
            </div>
          )}

          <form onSubmit={submit} className="mt-4 flex items-end gap-3">
            <div className="flex flex-col gap-2">
              <Label>Plan</Label>
              <select
                value={effectivePlan}
                onChange={(e) => setPlanId(e.target.value)}
                className="h-[42px] w-[220px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
              >
                {planOptions.map((p) => (
                  <option key={p.plan_id} value={p.plan_id}>{p.goal}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <input
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="h-[42px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Time</Label>
              <input
                type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="h-[42px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
              />
            </div>
            <Button type="submit" variant="dark" disabled={busy}>
              {busy ? "Scheduling…" : "Schedule"}
            </Button>
          </form>
          {error && <div className="mt-2 text-[13px] text-coral">{error}</div>}
          {saved && <div className="mt-2 text-[13px] text-good">{saved}</div>}

          <div className="mt-9">
            <Label>Upcoming sessions</Label>
            <Hairline className="mt-2" />
            {sessions.loading && <div className="py-6"><Label>Loading…</Label></div>}
            {sessions.error && <div className="py-6 text-[13px] text-coral">{sessions.error}</div>}
            {!sessions.loading && sorted.length === 0 && (
              <div className="py-6"><Label>Nothing scheduled</Label></div>
            )}
            {sorted.map((s) => (
              <div key={s.session_id}>
                <div className="flex items-center justify-between py-4">
                  <span className="font-sans text-[14px] text-charcoal">
                    {s.scheduled_date} · {s.scheduled_time.slice(0, 5)}
                  </span>
                  <Badge tone={s.status === "scheduled" ? "good" : "neutral"}>{s.status}</Badge>
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
