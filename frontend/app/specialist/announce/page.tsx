"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { sendSpecialistAnnouncement } from "@/lib/api/specialist";

const AUDIENCES = [
  { value: "gym_users", label: "All members" },
  { value: "all", label: "Everyone" },
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
      <main className="flex-1 overflow-auto">
        <div className="max-w-[560px] px-9 py-[30px]">
          <Label>Broadcast to members</Label>
          <p className="mt-1 font-sans text-[13px] text-muted">
            Sends a notification to each recipient&apos;s inbox.
          </p>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Audience</Label>
              <div className="flex gap-[10px]">
                {AUDIENCES.map((a) => (
                  <Chip key={a.value} active={audience === a.value} onClick={() => setAudience(a.value)}>
                    {a.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Title</Label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New mindfulness series this week"
                className="h-[42px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Message (optional)</Label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="border border-border bg-white px-3 py-2 text-[14px] text-charcoal outline-none focus:border-charcoal"
              />
            </div>

            {error && <div className="text-[13px] text-coral">{error}</div>}
            {sent && <div className="text-[13px] text-good">{sent}</div>}

            <div>
              <Button type="submit" variant="dark" disabled={busy}>
                {busy ? "Sending…" : "Send announcement"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
