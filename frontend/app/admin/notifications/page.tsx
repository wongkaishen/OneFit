"use client";
import { useMemo, useState } from "react";
import { NotificationsPage } from "@/components/shell/NotificationsPage";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { ApiError } from "@/lib/api/client";
import { useResource } from "@/lib/api/useResource";
import { listUsers, sendNotification } from "@/lib/api/admin";
import type { UserOut } from "@/lib/api/types";

// Direct message to ONE user. Broadcasts to a role/everyone go through
// Announcements — that is the single broadcast tool, keeping the two distinct.
function ComposeForm() {
  const { data: users } = useResource<UserOut[]>(listUsers, []);
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState("");
  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState("");
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return (users ?? []).slice(0, 8);
    return (users ?? [])
      .filter((u) => (u.name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 8);
  }, [users, query]);

  const selected = (users ?? []).find((u) => u.user_id === userId) ?? null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim() || !userId) return;
    setSendErr(null); setSent(null);
    try {
      await sendNotification({ user_id: userId, message: msg.trim(), title: title.trim() || undefined });
      setSent("Message sent."); setMsg(""); setTitle("");
    } catch (e2) {
      setSendErr(e2 instanceof ApiError ? e2.message : "Failed to send");
    }
  };

  return (
    <form onSubmit={send} className="mb-8 border border-border bg-white p-5">
      <Label>Message a user</Label>
      <p className="mt-1 text-[12px] text-muted">
        Sends a direct notification to one member. To reach a whole audience, use Announcements.
      </p>

      {selected ? (
        <div className="mt-3 flex items-center justify-between border border-border px-3 py-2 text-[14px]">
          <span className="text-charcoal">{selected.name ?? selected.email}{" "}
            <span className="text-muted">· {selected.email}</span></span>
          <button type="button" onClick={() => setUserId("")}
            className="text-[12px] font-semibold uppercase tracking-label text-subtle hover:text-charcoal">
            Change
          </button>
        </div>
      ) : (
        <>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a user by name or email"
            className="mt-3 h-[42px] w-full border border-border px-3 text-[14px] outline-none focus:border-charcoal" />
          {matches.length > 0 && (
            <div className="mt-1 max-h-[180px] overflow-auto border border-border">
              {matches.map((u) => (
                <div key={u.user_id} onClick={() => { setUserId(u.user_id); setQuery(""); }}
                  className="cursor-pointer border-b border-border px-3 py-2 text-[13px] text-charcoal hover:bg-cream last:border-b-0">
                  {u.name ?? u.email} <span className="text-muted">· {u.email} · {u.role}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)"
        className="mt-3 h-[42px] w-full border border-border px-3 text-[14px] outline-none focus:border-charcoal" />
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message" rows={3}
        className="mt-3 w-full border border-border px-3 py-2 text-[14px] outline-none focus:border-charcoal" />
      <div className="mt-3">
        <Button type="submit" variant="dark" disabled={!userId || !msg.trim()}>Send</Button>
      </div>
      {sendErr && <div className="mt-2 text-[13px] text-coral">{sendErr}</div>}
      {sent && <div className="mt-2 text-[13px] text-good">{sent}</div>}
    </form>
  );
}

export default function AdminNotifications() {
  return <NotificationsPage avatarLetter="A" topSlot={<ComposeForm />} />;
}
