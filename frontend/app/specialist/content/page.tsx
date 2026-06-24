"use client";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useResource } from "@/lib/api/useResource";
import { listContent, createContent, updateContent } from "@/lib/api/specialist";
import type { ContentOut } from "@/lib/api/types";

const FILTERS = ["All", "Draft", "Published"];
function toneFor(status: string): "live" | "draft" | "archived" {
  const s = status.toLowerCase();
  if (s.includes("publish")) return "live";
  if (s.includes("archiv")) return "archived";
  return "draft";
}

export default function ContentPage() {
  const { data, error, loading, setData } = useResource<ContentOut[]>(listContent, []);
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body: "", category: "", media_url: "", permission_confirmed: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const shown = useMemo(() => {
    const list = data ?? [];
    if (filter === "All") return list;
    return list.filter((c) => c.status.toLowerCase().includes(filter.toLowerCase()));
  }, [data, filter]);

  const resetForm = () => {
    setForm({ title: "", body: "", category: "", media_url: "", permission_confirmed: false });
    setEditingId(null);
    setErr(null);
  };

  const openCreate = () => {
    if (showForm) { setShowForm(false); resetForm(); return; }
    resetForm();
    setShowForm(true);
  };

  const openEdit = (c: ContentOut) => {
    setEditingId(c.content_id);
    setForm({
      title: c.title,
      body: c.body,
      category: c.category,
      media_url: c.media_url ?? "",
      permission_confirmed: true, // already declared when first saved
    });
    setErr(null);
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim() || !form.category.trim()) {
      setErr("Title, body and category are required.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (editingId) {
        const updated = await updateContent(editingId, {
          title: form.title,
          body: form.body,
          category: form.category,
          media_url: form.media_url || null,
        });
        setData((data ?? []).map((c) => (c.content_id === editingId ? updated : c)));
      } else {
        const created = await createContent({
          title: form.title,
          body: form.body,
          category: form.category,
          media_url: form.media_url || null,
          permission_confirmed: form.permission_confirmed,
        });
        setData([created, ...(data ?? [])]);
      }
      setShowForm(false);
      resetForm();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (c: ContentOut, status: "Published" | "Archived" | "Draft") => {
    setRowBusy(c.content_id);
    try {
      const updated = await updateContent(c.content_id, { status });
      setData((data ?? []).map((x) => (x.content_id === c.content_id ? updated : x)));
    } catch {
      /* surfaced via list refresh on next load */
    } finally {
      setRowBusy(null);
    }
  };

  return (
    <>
      <TopBar title="Content" search="Search content" avatarLetter="J" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <div className="mb-[22px] flex items-center justify-between">
            <div className="flex gap-[10px]">
              {FILTERS.map((f) => (
                <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
              ))}
            </div>
            <Button size="sm" onClick={openCreate}>
              {showForm ? "Close" : "+ Create content"}
            </Button>
          </div>

          {showForm && (
            <div className="mb-8 border border-border bg-white p-6">
              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <input placeholder="Title" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="border border-border bg-white p-2 font-sans text-[13px] outline-none" />
                <input placeholder="Category (e.g. Mental resilience)" value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="border border-border bg-white p-2 font-sans text-[13px] outline-none" />
              </div>
              <textarea placeholder="Body" value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="mt-3 h-24 w-full resize-none border border-border bg-white p-2 font-sans text-[13px] outline-none" />
              <input placeholder="Media URL (optional)" value={form.media_url}
                onChange={(e) => setForm({ ...form, media_url: e.target.value })}
                className="mt-3 w-full border border-border bg-white p-2 font-sans text-[13px] outline-none" />
              {!editingId && (
                <label className="mt-3 flex items-center gap-2 font-sans text-[12px] text-subtle">
                  <input type="checkbox" checked={form.permission_confirmed}
                    onChange={(e) => setForm({ ...form, permission_confirmed: e.target.checked })} />
                  I confirm I have the rights to publish this content.
                </label>
              )}
              {err && <div className="mt-3 font-sans text-[12px] text-coral">{err}</div>}
              <div className="mt-4 flex items-center gap-3">
                <Button size="sm" onClick={submit} disabled={busy}>
                  {busy ? "Saving…" : editingId ? "Update content" : "Save content"}
                </Button>
                {editingId && (
                  <span className="font-sans text-[11px] text-muted">Editing existing content</span>
                )}
              </div>
            </div>
          )}

          {loading && <Label>Loading…</Label>}
          {error && <div className="text-[13px] text-coral">{error}</div>}
          {!loading && !error && shown.length === 0 && <Label>No content yet</Label>}

          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {shown.map((p) => (
              <div key={p.content_id} className="flex min-h-[150px] flex-col border border-border p-[22px]">
                <div><Badge tone={toneFor(p.status)}>{p.status}</Badge></div>
                <div className="mt-[18px] font-sans text-[18px] font-semibold text-charcoal">{p.title}</div>
                <div className="mt-2 font-sans text-[12px] text-muted">{p.category}</div>
                <div className="mt-auto flex flex-wrap items-center gap-4 pt-[18px]">
                  <button
                    onClick={() => openEdit(p)}
                    disabled={rowBusy === p.content_id}
                    className="cursor-pointer border-b border-charcoal pb-[2px] font-sans text-[10px] font-bold uppercase tracking-label text-charcoal disabled:opacity-40"
                  >
                    Edit
                  </button>
                  {p.status !== "Published" && (
                    <button
                      onClick={() => changeStatus(p, "Published")}
                      disabled={rowBusy === p.content_id}
                      className="cursor-pointer border-b border-good pb-[2px] font-sans text-[10px] font-bold uppercase tracking-label text-good disabled:opacity-40"
                    >
                      {rowBusy === p.content_id ? "…" : "Publish"}
                    </button>
                  )}
                  {p.status !== "Archived" && (
                    <button
                      onClick={() => changeStatus(p, "Archived")}
                      disabled={rowBusy === p.content_id}
                      className="cursor-pointer border-b border-muted pb-[2px] font-sans text-[10px] font-bold uppercase tracking-label text-muted disabled:opacity-40"
                    >
                      Archive
                    </button>
                  )}
                  {p.status === "Archived" && (
                    <button
                      onClick={() => changeStatus(p, "Draft")}
                      disabled={rowBusy === p.content_id}
                      className="cursor-pointer border-b border-muted pb-[2px] font-sans text-[10px] font-bold uppercase tracking-label text-muted disabled:opacity-40"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
