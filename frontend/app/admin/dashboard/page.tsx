"use client";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
import { useResource } from "@/lib/api/useResource";
import { getStats, getAuditLog } from "@/lib/api/admin";
import { relativeTime } from "@/lib/format";
import type { AdminStats, AuditEntry } from "@/lib/api/types";

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-3 p-[22px]">
      <Label>{label}</Label>
      <span className="font-sans text-[32px] font-bold leading-none text-charcoal">{value}</span>
      <span className="font-sans text-[12px] text-muted">{sub}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const stats = useResource<AdminStats>(getStats, []);
  const audit = useResource<AuditEntry[]>(getAuditLog, []);
  const s = stats.data;

  return (
    <>
      <TopBar title="Dashboard" search="Search" avatarLetter="S" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <PageIntro>
            Platform health at a glance — user totals, pending approvals, and a live feed of recent
            administrative activity.
          </PageIntro>
          <Label>System overview · live</Label>

          {stats.error && <div className="mt-4 text-[13px] text-coral">{stats.error}</div>}

          <div className="mt-4 grid border border-border" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            <div className="border-r border-border">
              <Kpi label="Total users" value={s ? String(s.total_users) : "—"} sub={s ? `${s.total_gym_users} gym users` : ""} />
            </div>
            <div className="border-r border-border">
              <Kpi label="Wellness specialists" value={s ? String(s.total_specialists) : "—"} sub={s ? `${s.total_admins} admins` : ""} />
            </div>
            <div className="border-r border-border">
              <Kpi label="Active today" value={s ? String(s.active_today) : "—"} sub="logins today" />
            </div>
            <div>
              <Kpi label="Pending approvals" value={s ? String(s.pending_approvals) : "—"} sub="awaiting review" />
            </div>
          </div>

          <div className="mt-[34px]">
            <div className="mb-2 flex items-baseline justify-between">
              <Label>Recent activity</Label>
            </div>
            <Hairline />
            {audit.loading && <div className="py-6"><Label>Loading…</Label></div>}
            {audit.error && <div className="py-6 text-[13px] text-coral">{audit.error}</div>}
            {!audit.loading && (audit.data ?? []).length === 0 && (
              <div className="py-6"><Label>No recent activity</Label></div>
            )}
            {(audit.data ?? []).map((e) => (
              <div key={e.log_id}>
                <div className="flex items-center justify-between py-[15px]">
                  <div className="flex items-center gap-[14px]">
                    <span className="h-[6px] w-[6px] bg-border" />
                    <span className="font-sans text-[13px] text-charcoal">
                      <b className="font-semibold">{e.actor_name ?? "System"}</b> {e.action}{" "}
                      <span className="text-subtle">{e.details ?? ""}</span>
                    </span>
                  </div>
                  <Label>{relativeTime(e.created_at)}</Label>
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
