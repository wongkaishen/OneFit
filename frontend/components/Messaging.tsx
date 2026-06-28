"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { listThreads, getThread, sendMessage } from "@/lib/api/messages";
import type { Message, MessageThread } from "@/lib/api/types";

export function Messaging({ avatarLetter }: { avatarLetter: string }) {
  const threads = useResource<MessageThread[]>(listThreads, []);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");

  useEffect(() => { if (active) getThread(active).then(setMsgs).catch(() => setMsgs([])); }, [active]);

  const send = async () => {
    if (!active || !text.trim()) return;
    const m = await sendMessage(active, text.trim());
    setMsgs((prev) => [...prev, m]); setText("");
  };

  return (
    <>
      <TopBar title="Messages" search="Search" avatarLetter={avatarLetter} />
      <main className="flex-1 overflow-auto">
        <div className="flex h-full">
          <div className="w-72 border-r border-border">
            <div className="px-5 py-4"><Label>Conversations</Label></div>
            {threads.data != null && !threads.error && (threads.data ?? []).length === 0 && (
              <div className="px-5"><EmptyState title="No conversations yet." /></div>
            )}
            {(threads.data ?? []).map((t) => (
              <button key={t.partner_id} onClick={() => setActive(t.partner_id)}
                className={`block w-full px-5 py-3 text-left ${active === t.partner_id ? "bg-cream" : ""}`}>
                <div className="font-sans text-[14px] text-charcoal">{t.partner_name ?? "Contact"}</div>
                <div className="truncate font-sans text-[12px] text-muted">{t.last_body}</div>
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-col">
            {!active ? (
              <div className="p-9"><PageIntro>Select a conversation to start messaging.</PageIntro></div>
            ) : (
              <>
                <div className="flex-1 overflow-auto p-6">
                  {msgs.map((m) => (
                    <div key={m.message_id} className="mb-3">
                      <div className="font-sans text-[14px] text-charcoal">{m.body}</div>
                    </div>
                  ))}
                </div>
                <Hairline />
                <div className="flex items-end gap-3 p-4">
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…"
                    onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                    className="h-[42px] flex-1 border border-border px-3 text-[14px] outline-none focus:border-charcoal" />
                  <Button type="button" variant="dark" onClick={send}>Send</Button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
