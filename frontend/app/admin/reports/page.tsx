"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Hairline } from "@/components/ui/Hairline";
import { Label } from "@/components/ui/Label";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { adminListReports, adminResolveReport } from "@/lib/api/admin";
import { relativeTime } from "@/lib/format";
import type { ReportOut } from "@/lib/api/types";

const FILTERS: [string, string][] = [
  ["Open", "open"],
  ["Actioned", "actioned"],
  ["Dismissed", "dismissed"],
  ["All", "all"],
];

function statusTone(s: string): "good" | "flag" | "neutral" {
  if (s === "actioned") return "good";
  if (s === "open") return "flag";
  return "neutral";
}

export default function AdminReportsPage() {
  const [filter, setFilter] = useState("open");
  const { data, error, loading, setData } = useResource<ReportOut[]>(
    () => adminListReports(filter),
    [filter],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const resolve = async (
    r: ReportOut,
    action: "dismiss" | "remove_post" | "suspend_user",
  ) => {
    const verb = action === "suspend_user" ? `suspend ${r.target_user_name ?? "this user"}` : action.replace("_", " ");
    if (!window.confirm(`Are you sure you want to ${verb}?`)) return;
    setBusy(r.report_id); setActionErr(null);
    try {
      const updated = await adminResolveReport(r.report_id, action);
      // If the current filter no longer matches, drop the row; else replace it.
      setData((prev) =>
        (prev ?? []).flatMap((x) => {
          if (x.report_id !== r.report_id) return [x];
          return filter === "all" || filter === updated.status ? [updated] : [];
        }),
      );
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "Couldn't resolve the report.");
    } finally {
      setBusy(null);
    }
  };

  const reports = data ?? [];

  return (
    <>
      <TopBar title="Reports" search="Search" avatarLetter="A" />
      <PageBody>
        <PageHeader eyebrow="Moderation">
          Member reports of posts, messages, and users. Dismiss, remove the post, or suspend the offender.
        </PageHeader>

        <div className="mb-[18px] flex flex-wrap gap-[10px]">
          {FILTERS.map(([label, value]) => (
            <Chip key={value} active={filter === value} onClick={() => setFilter(value)}>{label}</Chip>
          ))}
        </div>

        {actionErr && <div className="mb-3 text-[13px] text-coral">{actionErr}</div>}
        {loading && <div className="p-6"><Label>Loading…</Label></div>}
        {error && <div className="p-6 text-[13px] text-coral">{error}</div>}

        {!loading && !error && reports.length === 0 && (
          <EmptyState title="Nothing to review" icon="security">No reports in this view.</EmptyState>
        )}

        {reports.length > 0 && (
          <Card padded={false}>
            {reports.map((r, i) => (
              <div key={r.report_id}>
                {i > 0 && <Hairline />}
                <div className="flex flex-col gap-3 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{r.target_type}</Badge>
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                    <span className="font-sans text-[12px] text-muted">{relativeTime(r.created_at)}</span>
                    <span className="font-sans text-[12px] text-muted">
                      · reported by {r.reporter_name ?? "a member"}
                    </span>
                  </div>

                  {r.reason && (
                    <div className="font-sans text-[13px] italic text-subtle">“{r.reason}”</div>
                  )}
                  {r.target_summary && (
                    <div className="border-l-2 border-border pl-3 font-sans text-[14px] text-charcoal">
                      {r.target_summary}
                    </div>
                  )}
                  {r.target_user_name && (
                    <div className="font-sans text-[12px] text-muted">Offender: {r.target_user_name}</div>
                  )}

                  {r.status === "open" && (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => resolve(r, "dismiss")} disabled={busy === r.report_id}>
                        Dismiss
                      </Button>
                      {r.target_type === "post" && (
                        <Button type="button" variant="ghost" size="sm"
                          onClick={() => resolve(r, "remove_post")} disabled={busy === r.report_id}>
                          Remove post
                        </Button>
                      )}
                      {r.target_user_id && (
                        <Button type="button" variant="dark" size="sm"
                          onClick={() => resolve(r, "suspend_user")} disabled={busy === r.report_id}>
                          Suspend user
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </PageBody>
    </>
  );
}
