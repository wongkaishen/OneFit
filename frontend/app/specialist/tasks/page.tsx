"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
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
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <PageIntro>Assign tasks to your clients and track their status. The client is notified when you assign a task.</PageIntro>

          <Label>Assign a task</Label>
          <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-3">
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)}
              className="h-[42px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal">
              <option value="">Select client…</option>
              {(clients.data ?? []).map((c) => (
                <option key={c.user_id} value={c.user_id}>{c.name ?? c.email}</option>
              ))}
            </select>
            <input value={type} onChange={(e) => setType(e.target.value)} placeholder="Type (e.g. Cardio goal)"
              className="h-[42px] border border-border bg-white px-3 text-[14px] outline-none focus:border-charcoal" />
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description"
              className="col-span-2 h-[42px] border border-border bg-white px-3 text-[14px] outline-none focus:border-charcoal" />
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="h-[42px] border border-border bg-white px-3 text-[14px] outline-none focus:border-charcoal" />
            <Button type="submit" variant="dark" disabled={busy}>{busy ? "Assigning…" : "Assign task"}</Button>
          </form>
          {err && <div className="mt-2 text-[13px] text-coral">{err}</div>}

          <div className="mt-9">
            <Label>Assigned tasks</Label>
            <Hairline className="mt-2" />
            {tasks.loading && <div className="py-6"><Label>Loading…</Label></div>}
            {tasks.error && <div className="py-6 text-[13px] text-coral">{tasks.error}</div>}
            {!tasks.loading && !tasks.error && (tasks.data ?? []).length === 0 && (
              <EmptyState title="No tasks yet">Assign your first task above.</EmptyState>
            )}
            {(tasks.data ?? []).map((t) => (
              <div key={t.task_id}>
                <div className="flex items-center justify-between py-4">
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
                <Hairline />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
