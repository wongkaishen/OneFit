"use client";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { useResource } from "@/lib/api/useResource";
import { getStats, getAuditLog } from "@/lib/api/admin";
import { relativeTime } from "@/lib/format";
import type { AdminStats, AuditEntry } from "@/lib/api/types";

export default function AdminDashboardPage() {
  const stats = useResource<AdminStats>(getStats, []);
  const audit = useResource<AuditEntry[]>(getAuditLog, []);
  const s = stats.data;
  const [query, setQuery] = useState("");

  const auditItems = useMemo(() => {
    const list = audit.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) =>
      [e.actor_name, e.action, e.details]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [audit.data, query]);

  return (
    <>
      <TopBar title="Dashboard" search="Search recent activity" avatarLetter="A" searchValue={query} onSearch={setQuery} />
      <PageBody>
        <PageHeader eyebrow="System overview · live">
          Platform health at a glance — user totals, pending approvals, and a live feed of recent
          administrative activity.
        </PageHeader>

          {stats.error && <div className="mb-4 text-[13px] text-coral">{stats.error}</div>}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card><Stat label="Total users" value={s ? String(s.total_users) : "—"} sub={s ? `${s.total_gym_users} gym users` : ""} /></Card>
            <Card><Stat label="Wellness specialists" value={s ? String(s.total_specialists) : "—"} sub={s ? `${s.total_admins} admins` : ""} /></Card>
            <Card><Stat label="Active today" value={s ? String(s.active_today) : "—"} sub="logins today" accent /></Card>
            <Card><Stat label="Pending approvals" value={s ? String(s.pending_approvals) : "—"} sub="awaiting review" /></Card>
          </div>

          <div className="mt-8">
            <Label>Recent activity</Label>
            <Card padded={false} className="mt-3">
            {audit.loading && <div className="p-6"><Label>Loading…</Label></div>}
            {audit.error && <div className="p-6 text-[13px] text-coral">{audit.error}</div>}
            {!audit.loading && auditItems.length === 0 && (
              <div className="p-6"><Label>{query ? "No matching activity" : "No recent activity"}</Label></div>
            )}
            {auditItems.map((e, i) => (
              <div key={e.log_id}>
                {i > 0 && <Hairline />}
                <div className="flex items-center justify-between gap-4 px-5 py-[15px]">
                  <div className="flex items-center gap-[14px]">
                    <span className="h-[6px] w-[6px] flex-none bg-coral" />
                    <span className="font-sans text-[13px] text-charcoal">
                      <b className="font-semibold">{e.actor_name ?? "System"}</b> {e.action}{" "}
                      <span className="text-subtle">{e.details ?? ""}</span>
                    </span>
                  </div>
                  <Label>{relativeTime(e.created_at)}</Label>
                </div>
              </div>
            ))}
            </Card>
          </div>
      </PageBody>
    </>
  );
}
