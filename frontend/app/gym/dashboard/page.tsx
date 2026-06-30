"use client";
import Link from "next/link";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader, Section } from "@/components/shell/Page";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useResource } from "@/lib/api/useResource";
import { getDashboard, listPlans, listSessions } from "@/lib/api/gym";
import type { GymDashboard, WorkoutPlan, WorkoutSession } from "@/lib/api/types";

function CalorieRing({ consumed, burned }: { consumed: number; burned: number }) {
  const net = consumed - burned;
  const pct = Math.max(0, Math.min(100, (consumed / 2000) * 100));
  const r = 54;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
      <svg width="148" height="148" viewBox="0 0 148 148" className="flex-none">
        <circle cx="74" cy="74" r={r} fill="none" stroke="var(--cream-deep)" strokeWidth="12" />
        <circle
          cx="74" cy="74" r={r} fill="none" stroke="var(--coral)" strokeWidth="12"
          strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
          strokeLinecap="round" transform="rotate(-90 74 74)"
        />
        <text x="74" y="70" textAnchor="middle" className="fill-charcoal" style={{ fontSize: 30, fontFamily: "var(--font-garamond)" }}>
          {Math.round(net)}
        </text>
        <text x="74" y="90" textAnchor="middle" className="fill-muted" style={{ fontSize: 9, letterSpacing: 1.5 }}>
          NET KCAL
        </text>
      </svg>
      <div className="grid flex-1 grid-cols-2 gap-5">
        <Stat label="Consumed" value={`${Math.round(consumed)}`} sub="kcal in" />
        <Stat label="Burned" value={`${Math.round(burned)}`} sub="kcal out" accent />
      </div>
    </div>
  );
}

const QUICK: { href: string; label: string; icon: IconName }[] = [
  { href: "/gym/activity", label: "Log activity", icon: "activity" },
  { href: "/gym/diet", label: "Log diet", icon: "diet" },
  { href: "/gym/progress", label: "Update progress", icon: "progress" },
];

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
      <PageBody>
        <PageHeader eyebrow="Today · at a glance">
          Your calories in vs out, your active plan and next session, plus quick links to log
          activity, diet, and progress.
        </PageHeader>

        {dash.error && <div className="mb-4 text-[13px] text-coral">{dash.error}</div>}

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader eyebrow="Calorie balance" title="Today" />
            <div className="mt-6">
              {dash.loading ? (
                <div className="flex items-center gap-8">
                  <Skeleton className="h-[148px] w-[148px] rounded-full" />
                  <div className="flex-1 space-y-3"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-6 w-1/3" /></div>
                </div>
              ) : (
                <CalorieRing
                  consumed={dash.data?.calories_consumed ?? 0}
                  burned={dash.data?.calories_burned ?? 0}
                />
              )}
            </div>
            <div className="mt-6 flex gap-8 border-t border-border pt-4">
              <span className="font-sans text-[12px] text-muted">{dash.data?.diet_entries ?? 0} diet entries</span>
              <span className="font-sans text-[12px] text-muted">{dash.data?.activity_entries ?? 0} activity entries</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-center gap-7">
            <Stat
              label="Current streak"
              value={dash.loading ? "—" : `${dash.data?.current_streak ?? 0}d`}
              accent
            />
            <div className="h-px bg-border" />
            <Stat
              label="Active days this week"
              value={dash.loading ? "—" : `${dash.data?.active_days_this_week ?? 0}/${dash.data?.weekly_goal ?? 7}`}
            />
          </Card>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Card>
            <CardHeader eyebrow="Active plan" />
            {activePlan ? (
              <>
                <div className="mt-3 font-serif text-[20px] leading-snug text-charcoal">{activePlan.goal}</div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge tone="good">{activePlan.status}</Badge>
                  <span className="text-[11px] text-muted">via {activePlan.generated_by}</span>
                </div>
              </>
            ) : (
              <div className="mt-3 text-[13px] text-muted">
                No plan yet. <Link href="/gym/plans" className="font-medium text-coral hover:underline">Create one →</Link>
              </div>
            )}
          </Card>
          <Card>
            <CardHeader eyebrow="Next session" />
            {nextSession ? (
              <div className="mt-3 font-serif text-[20px] text-charcoal">
                {nextSession.scheduled_date} · {nextSession.scheduled_time.slice(0, 5)}
              </div>
            ) : (
              <div className="mt-3 text-[13px] text-muted">
                Nothing scheduled. <Link href="/gym/calendar" className="font-medium text-coral hover:underline">Plan a workout →</Link>
              </div>
            )}
          </Card>
        </div>

        <Section title="Quick actions" className="mt-9 mb-0">
          <div className="grid gap-3 sm:grid-cols-3">
            {QUICK.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="group flex items-center justify-between border border-border bg-paper p-4 shadow-card transition-shadow hover:shadow-raised"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center bg-cream-deep text-charcoal group-hover:bg-coral-soft group-hover:text-coral">
                    <Icon name={q.icon} size={18} />
                  </span>
                  <span className="font-sans text-[13px] font-medium text-charcoal">{q.label}</span>
                </span>
                <Icon name="chevron" size={16} className="text-muted group-hover:text-coral" />
              </Link>
            ))}
          </div>
        </Section>
      </PageBody>
    </>
  );
}
