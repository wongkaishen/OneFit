"use client";
import { useState } from "react";
import { NotificationsPage } from "@/components/shell/NotificationsPage";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { ApiError } from "@/lib/api/client";
import { sendNotification } from "@/lib/api/admin";

function ComposeForm() {
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("all");
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setSendErr(null); setSent(null);
    try {
      await sendNotification({ message: msg.trim(), audience, title: title.trim() || undefined });
      setSent("Notification sent."); setMsg(""); setTitle("");
    } catch (e2) {
      setSendErr(e2 instanceof ApiError ? e2.message : "Failed to send");
    }
  };

  return (
    <form onSubmit={send} className="mb-8 border border-border bg-white p-5">
      <Label>Compose notification</Label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)"
        className="mt-3 h-[42px] w-full border border-border px-3 text-[14px] outline-none focus:border-charcoal" />
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message" rows={3}
        className="mt-3 w-full border border-border px-3 py-2 text-[14px] outline-none focus:border-charcoal" />
      <div className="mt-3 flex items-center gap-3">
        <select value={audience} onChange={(e) => setAudience(e.target.value)}
          className="h-[42px] border border-border bg-white px-3 text-[14px] outline-none focus:border-charcoal">
          <option value="all">Everyone</option>
          <option value="gym_users">Gym users</option>
          <option value="specialists">Specialists</option>
        </select>
        <Button type="submit" variant="dark">Send</Button>
      </div>
      {sendErr && <div className="mt-2 text-[13px] text-coral">{sendErr}</div>}
      {sent && <div className="mt-2 text-[13px] text-good">{sent}</div>}
    </form>
  );
}

export default function AdminNotifications() {
  return <NotificationsPage avatarLetter="A" topSlot={<ComposeForm />} />;
}
