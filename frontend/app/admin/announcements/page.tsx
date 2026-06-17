"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useResource } from "@/lib/api/useResource";
import { listAnnouncements, createAnnouncement } from "@/lib/api/admin";
import { relativeTime } from "@/lib/format";
import type { AnnouncementOut } from "@/lib/api/types";

// Values must match VALID_AUDIENCE in backend/app/subsystems/admin/router.py
const AUDIENCES = ["all", "gym_users", "specialists"];

export default function AnnouncementsPage() {
  const { data, error, loading, setData } = useResource<AnnouncementOut[]>(listAnnouncements, []);
  const [form, setForm] = useState({ title: "", body: "", target_audience: "all" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setErr("Title and body are required.");
      return;
    }
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const created = await createAnnouncement(form);
      setData([created, ...(data ?? [])]);
      setForm({ title: "", body: "", target_audience: "all" });
      setOk("Announcement sent.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Announcements" search="Search" avatarLetter="S" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <div className="mb-8 border border-border bg-white p-6">
            <Label>New announcement</Label>
            <input placeholder="Title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-3 w-full border border-border bg-white p-2 font-sans text-[13px] outline-none" />
            <textarea placeholder="Body" value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="mt-3 h-24 w-full resize-none border border-border bg-white p-2 font-sans text-[13px] outline-none" />
            <div className="mt-3 flex items-center gap-3">
              <select value={form.target_audience}
                onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                className="h-[34px] border border-border bg-white px-2 font-sans text-[12px]">
                {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <Button size="sm" onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send announcement"}</Button>
            </div>
            {err && <div className="mt-3 font-sans text-[12px] text-coral">{err}</div>}
            {ok && <div className="mt-3 font-sans text-[12px] text-good">{ok}</div>}
          </div>

          <Label>Sent announcements</Label>
          <Hairline className="mt-3" />
          {loading && <div className="py-6"><Label>Loading…</Label></div>}
          {error && <div className="py-6 text-[13px] text-coral">{error}</div>}
          {!loading && (data ?? []).length === 0 && <div className="py-6"><Label>None yet</Label></div>}
          {(data ?? []).map((a) => (
            <div key={a.announcement_id}>
              <div className="flex items-start justify-between py-4">
                <div>
                  <div className="font-sans text-[14px] font-semibold text-charcoal">{a.title}</div>
                  <div className="mt-1 font-sans text-[12px] text-muted">{a.body}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="neutral">{a.target_audience}</Badge>
                  <Label>{relativeTime(a.sent_at)}</Label>
                </div>
              </div>
              <Hairline />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
