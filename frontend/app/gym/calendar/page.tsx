"use client";
import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { Card, CardHeader } from "@/components/ui/Card";
import { FormField, Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
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

  // A scheduled session whose date+time has already passed is shown as "Late".
  const displayStatus = (s: WorkoutSession): { label: string; tone: "good" | "neutral" | "flag" } => {
    if (s.status === "scheduled") {
      const when = new Date(`${s.scheduled_date}T${s.scheduled_time}`);
      if (!Number.isNaN(when.getTime()) && when.getTime() < Date.now()) {
        return { label: "Late", tone: "flag" };
      }
      return { label: "scheduled", tone: "good" };
    }
    return { label: s.status, tone: "neutral" };
  };

  return (
    <>
      <TopBar title="Calendar" search="Search" avatarLetter="G" />
      <PageBody>
        <PageHeader eyebrow="Calendar">
          Schedule sessions from your workout plans and keep an eye on what’s coming up. Conflicting
          time slots are blocked automatically.
        </PageHeader>

          <Card>
          <CardHeader eyebrow="Schedule a workout" title="New session" />
          {planOptions.length === 0 && !plans.loading && (
            <div className="mt-3 text-[13px] text-muted">
              You need a plan first.{" "}
              <Link href="/gym/plans" className="font-medium text-coral hover:underline">Create one →</Link>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Plan">
              <Select value={effectivePlan} onChange={(e) => setPlanId(e.target.value)}>
                {planOptions.map((p) => (
                  <option key={p.plan_id} value={p.plan_id}>{p.goal}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
            <FormField label="Time">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </FormField>
            <Button type="submit" variant="dark" disabled={busy} fullWidth>
              {busy ? "Scheduling…" : "Schedule"}
            </Button>
          </form>
          {error && <div className="mt-3 text-[13px] text-coral">{error}</div>}
          {saved && <div className="mt-3 text-[13px] text-good">{saved}</div>}
          </Card>

          <div className="mt-9">
            <Label>Upcoming sessions</Label>
            <div className="mt-3">
            {sessions.loading && <div className="py-6"><Label>Loading…</Label></div>}
            {sessions.error && <div className="py-6 text-[13px] text-coral">{sessions.error}</div>}
            {!sessions.loading && sorted.length === 0 && (
              <EmptyState title="Nothing scheduled" icon="calendar">
                Schedule a session above and it will show up here.
              </EmptyState>
            )}
            {sorted.length > 0 && (
            <Card padded={false}>
            {sorted.map((s, i) => (
              <div key={s.session_id}>
                {i > 0 && <Hairline />}
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="font-sans text-[14px] text-charcoal">
                    {s.scheduled_date} · {s.scheduled_time.slice(0, 5)}
                  </span>
                  {(() => { const d = displayStatus(s); return <Badge tone={d.tone}>{d.label}</Badge>; })()}
                </div>
              </div>
            ))}
            </Card>
            )}
            </div>
          </div>
      </PageBody>
    </>
  );
}
