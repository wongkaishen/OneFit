"use client";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useResource } from "@/lib/api/useResource";
import { listContent, createContent } from "@/lib/api/specialist";
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
  const [form, setForm] = useState({ title: "", body: "", category: "", media_url: "", permission_confirmed: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const shown = useMemo(() => {
    const list = data ?? [];
    if (filter === "All") return list;
    return list.filter((c) => c.status.toLowerCase().includes(filter.toLowerCase()));
  }, [data, filter]);

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim() || !form.category.trim()) {
      setErr("Title, body and category are required.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const created = await createContent({
        title: form.title,
        body: form.body,
        category: form.category,
        media_url: form.media_url || null,
        permission_confirmed: form.permission_confirmed,
      });
      setData([created, ...(data ?? [])]);
      setShowForm(false);
      setForm({ title: "", body: "", category: "", media_url: "", permission_confirmed: false });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setBusy(false);
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
            <Button size="sm" onClick={() => setShowForm((s) => !s)}>
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
              <label className="mt-3 flex items-center gap-2 font-sans text-[12px] text-subtle">
                <input type="checkbox" checked={form.permission_confirmed}
                  onChange={(e) => setForm({ ...form, permission_confirmed: e.target.checked })} />
                I confirm I have the rights to publish this content.
              </label>
              {err && <div className="mt-3 font-sans text-[12px] text-coral">{err}</div>}
              <div className="mt-4"><Button size="sm" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save content"}</Button></div>
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
                <div className="mt-auto pt-[18px]">
                  <span className="cursor-pointer border-b border-charcoal pb-[2px] font-sans text-[10px] font-bold uppercase tracking-label text-charcoal">
                    Edit
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
