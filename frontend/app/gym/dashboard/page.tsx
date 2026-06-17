"use client";
import Link from "next/link";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Badge } from "@/components/ui/Badge";
import { useResource } from "@/lib/api/useResource";
import { getDashboard, listPlans, listSessions } from "@/lib/api/gym";
import type { GymDashboard, WorkoutPlan, WorkoutSession } from "@/lib/api/types";

function CalorieRing({ consumed, burned }: { consumed: number; burned: number }) {
  const net = consumed - burned;
  // Visual fill against a soft 2000 kcal reference; purely indicative.
  const pct = Math.max(0, Math.min(100, (consumed / 2000) * 100));
  const r = 52;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-6">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke="var(--coral)" strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
          strokeLinecap="butt" transform="rotate(-90 70 70)"
        />
        <text x="70" y="66" textAnchor="middle" className="fill-charcoal" style={{ fontSize: 22, fontWeight: 700 }}>
          {Math.round(net)}
        </text>
        <text x="70" y="84" textAnchor="middle" className="fill-muted" style={{ fontSize: 10, letterSpacing: 1 }}>
          NET KCAL
        </text>
      </svg>
      <div className="flex flex-col gap-3">
        <div>
          <Label>Consumed</Label>
          <div className="font-sans text-[20px] font-bold text-charcoal">{Math.round(consumed)} kcal</div>
        </div>
        <div>
          <Label>Burned</Label>
          <div className="font-sans text-[20px] font-bold text-charcoal">{Math.round(burned)} kcal</div>
        </div>
      </div>
    </div>
  );
}

export default function GymDashboardPage() {
  const dash = useResource<GymDashboard>(getDashboard, []);
  const plans = useResource<WorkoutPlan[]>(listPlans, []);
  const sessions = useResource<WorkoutSession[]>(listSessions, []);

  const activePlan = (plans.data ?? []).find((p) => p.status === "active") ?? (plans.data ?? [])[0];
  const nextSession = (sessions.data ?? [])
    .filter((s) => s.status === "scheduled")
    .sort((a, b) => `${a.scheduled_date}T${a.scheduled_time}`.localeCompare(`${b.scheduled_date}T${b.scheduled_time}`))[0];

  return (
    <>
      <TopBar title="Dashboard" search="Search" avatarLetter="G" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <Label>Today · calorie balance</Label>

          {dash.error && <div className="mt-4 text-[13px] text-coral">{dash.error}</div>}

          <div className="mt-5 border border-border p-7">
            {dash.loading ? (
              <Label>Loading…</Label>
            ) : (
              <CalorieRing
                consumed={dash.data?.calories_consumed ?? 0}
                burned={dash.data?.calories_burned ?? 0}
              />
            )}
            <div className="mt-6 flex gap-8">
              <span className="font-sans text-[12px] text-muted">
                {dash.data?.diet_entries ?? 0} diet entries
              </span>
              <span className="font-sans text-[12px] text-muted">
                {dash.data?.activity_entries ?? 0} activity entries
              </span>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-5">
            <div className="border border-border p-6">
              <Label>Active plan</Label>
              {activePlan ? (
                <>
                  <div className="mt-3 font-sans text-[16px] font-semibold text-charcoal">{activePlan.goal}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone="good">{activePlan.status}</Badge>
                    <span className="text-[11px] text-muted">via {activePlan.generated_by}</span>
                  </div>
                </>
              ) : (
                <div className="mt-3 text-[13px] text-muted">
                  No plan yet.{" "}
                  <Link href="/gym/plans" className="text-charcoal underline">Create one</Link>
                </div>
              )}
            </div>
            <div className="border border-border p-6">
              <Label>Next session</Label>
              {nextSession ? (
                <div className="mt-3 font-sans text-[16px] font-semibold text-charcoal">
                  {nextSession.scheduled_date} · {nextSession.scheduled_time.slice(0, 5)}
                </div>
              ) : (
                <div className="mt-3 text-[13px] text-muted">
                  Nothing scheduled.{" "}
                  <Link href="/gym/calendar" className="text-charcoal underline">Plan a workout</Link>
                </div>
              )}
            </div>
          </div>

          <div className="mt-7">
            <Label>Quick actions</Label>
            <Hairline className="mt-2" />
            <div className="flex gap-6 py-4">
              <Link href="/gym/activity" className="text-[13px] text-charcoal underline">Log activity</Link>
              <Link href="/gym/diet" className="text-[13px] text-charcoal underline">Log diet</Link>
              <Link href="/gym/progress" className="text-[13px] text-charcoal underline">Update progress</Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
