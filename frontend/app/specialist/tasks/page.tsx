"use client";
import { useState } from "react";
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
import { listClients, listTasks, assignTask, deleteTask } from "@/lib/api/specialist";
import { shortDate } from "@/lib/format";
import type { ClientSummary, WellnessTaskOut } from "@/lib/api/types";

export default function SpecialistTasksPage() {
  const clients = useResource<ClientSummary[]>(listClients, []);
  const tasks = useResource<WellnessTaskOut[]>(listTasks, []);
  const [targetId, setTargetId] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const remove = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    setErr(null);
    setRowBusy(id);
    try {
      await deleteTask(id);
      tasks.setData((prev) => (prev ?? []).filter((t) => t.task_id !== id));
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Failed to delete task");
    } finally {
      setRowBusy(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !type.trim() || !description.trim() || !dueDate) return;
    setErr(null);
    setBusy(true);
    try {
      const task = await assignTask({ target_id: targetId, type: type.trim(), description: description.trim(), due_date: dueDate });
      tasks.setData((prev) => [task, ...(prev ?? [])]);
      setType(""); setDescription(""); setDueDate("");
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Failed to assign task");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Wellness tasks" search="Search" avatarLetter="S" />
      <PageBody>
        <PageHeader eyebrow="Wellness tasks">
          Assign tasks to your clients and track their status. The client is notified when you assign a task.
        </PageHeader>

          <Card>
          <CardHeader eyebrow="Assign a task" title="New task" />
          <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Client">
              <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                <option value="">Select client…</option>
                {(clients.data ?? []).map((c) => (
                  <option key={c.user_id} value={c.user_id}>{c.name ?? c.email}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Type">
              <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. Cardio goal" />
            </FormField>
            <FormField label="Description" className="sm:col-span-2">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should the client do?" />
            </FormField>
            <FormField label="Due date">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </FormField>
            <div className="flex items-end">
              <Button type="submit" variant="dark" disabled={busy} fullWidth>{busy ? "Assigning…" : "Assign task"}</Button>
            </div>
          </form>
          {err && <div className="mt-3 text-[13px] text-coral">{err}</div>}
          </Card>

          <div className="mt-9">
            <Label>Assigned tasks</Label>
            <div className="mt-3">
            {tasks.loading && <div className="py-6"><Label>Loading…</Label></div>}
            {tasks.error && <div className="py-6 text-[13px] text-coral">{tasks.error}</div>}
            {!tasks.loading && !tasks.error && (tasks.data ?? []).length === 0 && (
              <EmptyState title="No tasks yet" icon="tasks">Assign your first task above.</EmptyState>
            )}
            {(tasks.data ?? []).length > 0 && (
            <Card padded={false}>
            {(tasks.data ?? []).map((t, i) => (
              <div key={t.task_id}>
                {i > 0 && <Hairline />}
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <div className="font-sans text-[14px] text-charcoal">{t.type} — {t.description}</div>
                    <div className="mt-1 font-sans text-[11px] text-muted">Due {shortDate(t.due_date)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone="neutral">{t.status}</Badge>
                    <button
                      type="button"
                      onClick={() => remove(t.task_id)}
                      disabled={rowBusy === t.task_id}
                      className="font-sans text-[10px] font-bold uppercase tracking-label text-coral hover:underline disabled:opacity-40"
                    >
                      {rowBusy === t.task_id ? "…" : "Delete"}
                    </button>
                  </div>
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
