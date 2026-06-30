"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { FormField, Input, Textarea, Select } from "@/components/ui/Field";
import { useResource } from "@/lib/api/useResource";
import { listAnnouncements, createAnnouncement } from "@/lib/api/admin";
import { relativeTime } from "@/lib/format";
import type { AnnouncementOut } from "@/lib/api/types";

// Values must match VALID_AUDIENCE in backend/app/subsystems/admin/router.py
const AUDIENCES: { value: string; label: string }[] = [
  { value: "all", label: "Everyone (all roles)" },
  { value: "gym_users", label: "Gym members only" },
  { value: "specialists", label: "Specialists only" },
];

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
      <TopBar title="Announcements" search="Search" avatarLetter="A" />
      <PageBody>
        <PageHeader eyebrow="Announcements">
          Publish platform-wide announcements. Each one is delivered as a notification to its
          target audience the moment you send it.
        </PageHeader>
          <Card className="mb-8">
            <CardHeader eyebrow="New announcement" title="Compose" />
            <div className="mt-6 flex flex-col gap-4">
              <FormField label="Title">
                <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </FormField>
              <FormField label="Body">
                <Textarea placeholder="Write the announcement…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              </FormField>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
                <FormField label="Audience" className="sm:max-w-[280px] sm:flex-1">
                  <Select value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })}>
                    {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </Select>
                </FormField>
                <Button onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send announcement"}</Button>
              </div>
              {err && <div className="font-sans text-[12px] text-coral">{err}</div>}
              {ok && <div className="font-sans text-[12px] text-good">{ok}</div>}
            </div>
          </Card>

          <Label>Sent announcements</Label>
          <div className="mt-3">
          {loading && <div className="py-6"><Label>Loading…</Label></div>}
          {error && <div className="py-6 text-[13px] text-coral">{error}</div>}
          {!loading && (data ?? []).length === 0 && <div className="py-6"><Label>None yet</Label></div>}
          {(data ?? []).length > 0 && (
          <Card padded={false}>
          {(data ?? []).map((a, i) => (
            <div key={a.announcement_id}>
              {i > 0 && <Hairline />}
              <div className="flex items-start justify-between gap-3 px-5 py-4">
                <div>
                  <div className="font-sans text-[14px] font-semibold text-charcoal">{a.title}</div>
                  <div className="mt-1 font-sans text-[12px] text-muted">{a.body}</div>
                  <div className="mt-1 font-sans text-[11px] text-subtle">By {a.admin_name ?? "Admin"}</div>
                </div>
                <div className="flex flex-none flex-col items-end gap-2">
                  <Badge tone="neutral">{a.target_audience}</Badge>
                  <Label>{relativeTime(a.sent_at)}</Label>
                </div>
              </div>
            </div>
          ))}
          </Card>
          )}
          </div>
      </PageBody>
    </>
  );
}
