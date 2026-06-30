"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Label } from "@/components/ui/Label";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/client";
import { sendSpecialistAnnouncement } from "@/lib/api/specialist";

const AUDIENCES = [
  { value: "gym_users", label: "Gym members only" },
  { value: "all", label: "Everyone (members + specialists)" },
] as const;

export default function SpecialistAnnouncePage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"gym_users" | "all">("gym_users");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSent(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await sendSpecialistAnnouncement({ title: title.trim(), body: body.trim(), audience });
      setSent(`Announcement sent to ${res.sent} recipient${res.sent === 1 ? "" : "s"}.`);
      setTitle("");
      setBody("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send announcement");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Announce" search="Search" avatarLetter="S" />
      <PageBody max="form">
        <PageHeader eyebrow="Broadcast to members">
          Send a one-off message to your members. Each recipient in the chosen audience gets it as
          a notification in their inbox.
        </PageHeader>

          <Card>
          <CardHeader eyebrow="New announcement" title="Compose" />
          <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Audience</Label>
              <div className="flex flex-wrap gap-[10px]">
                {AUDIENCES.map((a) => (
                  <Chip key={a.value} active={audience === a.value} onClick={() => setAudience(a.value)}>
                    {a.label}
                  </Chip>
                ))}
              </div>
            </div>

            <FormField label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New mindfulness series this week" />
            </FormField>

            <FormField label="Message (optional)">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
            </FormField>

            {error && <div className="text-[13px] text-coral">{error}</div>}
            {sent && <div className="text-[13px] text-good">{sent}</div>}

            <div>
              <Button type="submit" variant="dark" disabled={busy}>
                {busy ? "Sending…" : "Send announcement"}
              </Button>
            </div>
          </form>
          </Card>
      </PageBody>
    </>
  );
}
