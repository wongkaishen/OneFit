"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Hairline } from "@/components/ui/Hairline";
import { Card } from "@/components/ui/Card";
import { FormField, Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import {
  listPrograms, removeProgram, adminListAllPrograms, adminProgramDetail, adminUpdateProgram,
} from "@/lib/api/admin";
import { shortDate } from "@/lib/format";
import type { ProgramOut, AdminPlanOut, AdminPlanDetail } from "@/lib/api/types";

const PLAN_STATUSES = ["active", "completed", "superseded"];

function planTone(status: string): "good" | "neutral" | "archived" {
  if (status === "active") return "good";
  if (status === "superseded") return "archived";
  return "neutral";
}

export default function AdminProgramsPage() {
  const [tab, setTab] = useState<"inactive" | "all">("inactive");
  return (
    <>
      <TopBar title="Programs" search="Search" avatarLetter="A" />
      <PageBody>
        <PageHeader eyebrow="Programs">
          Manage members&apos; workout programs. Viewing a plan&apos;s details and every edit or
          archive is recorded in the audit log.
        </PageHeader>
        <div className="mb-6 flex gap-[10px]">
          <Chip active={tab === "inactive"} onClick={() => setTab("inactive")}>Inactive</Chip>
          <Chip active={tab === "all"} onClick={() => setTab("all")}>All programs</Chip>
        </div>
        {tab === "inactive" ? <InactiveTab /> : <AllProgramsTab />}
      </PageBody>
    </>
  );
}

function InactiveTab() {
  const { data, error, loading, setData } = useResource<ProgramOut[]>(() => listPrograms(30), []);

  const remove = async (id: string) => {
    if (!confirm("Archive this inactive program? Its scheduled sessions will be marked missed.")) return;
    try {
      await removeProgram(id);
      setData((prev) => (prev ?? []).filter((p) => p.plan_id !== id));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Action failed");
    }
  };

  return (
    <>
      <p className="mb-4 text-[13px] text-muted">
        Programs with no activity in the last 30 days. Archiving keeps history but removes them from
        active plans.
      </p>
      {loading && <div className="py-6"><Label>Loading…</Label></div>}
      {error && <div className="py-6 text-[13px] text-coral">{error}</div>}
      {!loading && !error && (data ?? []).length === 0 && (
        <EmptyState title="No inactive programs" icon="programs">Nothing to clean up.</EmptyState>
      )}
      {(data ?? []).length > 0 && (
        <Card padded={false}>
          {(data ?? []).map((p, i) => (
            <div key={p.plan_id}>
              {i > 0 && <Hairline />}
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <div className="font-sans text-[14px] text-charcoal">{p.goal}</div>
                  <div className="mt-1 font-sans text-[11px] text-muted">
                    Created {shortDate(p.created_at)}
                    {p.last_activity_at ? ` · last activity ${shortDate(p.last_activity_at)}` : ""}
                  </div>
                </div>
                <Button type="button" variant="ghost" onClick={() => remove(p.plan_id)}>Archive</Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

function AllProgramsTab() {
  const [filter, setFilter] = useState<string>("");
  const { data, error, loading, setData } = useResource<AdminPlanOut[]>(
    () => adminListAllPrograms(filter || undefined), [filter],
  );
  const [open, setOpen] = useState<string | null>(null);

  const patch = (updated: AdminPlanOut) =>
    setData((prev) => (prev ?? []).map((p) => (p.plan_id === updated.plan_id ? updated : p)));

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-[10px]">
        <Chip active={filter === ""} onClick={() => setFilter("")}>All</Chip>
        {PLAN_STATUSES.map((s) => (
          <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{s}</Chip>
        ))}
      </div>
      {loading && <div className="py-6"><Label>Loading…</Label></div>}
      {error && <div className="py-6 text-[13px] text-coral">{error}</div>}
      {!loading && !error && (data ?? []).length === 0 && (
        <EmptyState title="No programs" icon="programs">No programs match this filter.</EmptyState>
      )}
      {(data ?? []).length > 0 && (
        <Card padded={false}>
          {(data ?? []).map((p, i) => (
            <div key={p.plan_id}>
              {i > 0 && <Hairline />}
              <PlanRow
                plan={p}
                expanded={open === p.plan_id}
                onToggle={() => setOpen(open === p.plan_id ? null : p.plan_id)}
                onPatched={patch}
              />
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

function PlanRow({ plan, expanded, onToggle, onPatched }: {
  plan: AdminPlanOut;
  expanded: boolean;
  onToggle: () => void;
  onPatched: (p: AdminPlanOut) => void;
}) {
  const [detail, setDetail] = useState<AdminPlanDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [goal, setGoal] = useState(plan.goal);
  const [status, setStatus] = useState(plan.status);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!expanded || detail) return;
    adminProgramDetail(plan.plan_id)
      .then(setDetail)
      .catch((e) => setDetailError(e instanceof ApiError ? e.message : "Couldn't load detail."));
  }, [expanded, detail, plan.plan_id]);

  const save = async () => {
    setBusy(true);
    try {
      const updated = await adminUpdateProgram(plan.plan_id, { goal, status });
      onPatched(updated);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const dirty = goal !== plan.goal || status !== plan.status;

  return (
    <div className="px-5 py-4">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 text-left">
        <div>
          <div className="font-sans text-[14px] text-charcoal">{plan.goal}</div>
          <div className="mt-1 font-sans text-[11px] text-muted">
            {plan.owner_name ?? "Unknown"}{plan.owner_email ? ` · ${plan.owner_email}` : ""}
            {` · ${plan.generated_by} · created ${shortDate(plan.created_at)}`}
          </div>
        </div>
        <Badge tone={planTone(plan.status)}>{plan.status}</Badge>
      </button>

      {expanded && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Goal">
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} />
            </FormField>
            <FormField label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {PLAN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="mt-3">
            <Button size="sm" onClick={save} disabled={busy || !dirty}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>

          {detailError && <div className="mt-4 text-[13px] text-coral">{detailError}</div>}
          {detail && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <Label>Exercises ({detail.exercises.length})</Label>
                {detail.exercises.length === 0 ? (
                  <div className="mt-2 text-[12px] text-muted">None.</div>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {detail.exercises.map((ex) => (
                      <li key={ex.exercise_id} className="text-[13px] text-charcoal">
                        {ex.name}
                        {(ex.sets || ex.reps) ? ` — ${ex.sets ?? "?"}×${ex.reps ?? "?"}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <Label>Sessions ({detail.sessions.length})</Label>
                {detail.sessions.length === 0 ? (
                  <div className="mt-2 text-[12px] text-muted">None scheduled.</div>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {detail.sessions.map((s) => (
                      <li key={s.session_id} className="text-[13px] text-charcoal">
                        {shortDate(s.scheduled_date)} · {s.status}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
