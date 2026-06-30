"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useResource } from "@/lib/api/useResource";
import { listThreads, getThread, sendMessage } from "@/lib/api/messages";
import { ApiError } from "@/lib/api/client";
import { relativeTime } from "@/lib/format";
import type { Message, MessageThread } from "@/lib/api/types";

function initials(name: string | null) {
  return (name ?? "?").trim().slice(0, 1).toUpperCase() || "?";
}

export function Messaging({
  avatarLetter,
  initialPartnerId,
  initialPartnerName,
}: {
  avatarLetter: string;
  initialPartnerId?: string | null;
  initialPartnerName?: string | null;
}) {
  const threads = useResource<MessageThread[]>(listThreads, []);
  const [active, setActive] = useState<string | null>(initialPartnerId ?? null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sendErr, setSendErr] = useState<string | null>(null);

  useEffect(() => { if (active) getThread(active).then(setMsgs).catch(() => setMsgs([])); }, [active]);

  // Fall back to the passed-in partner so a brand-new conversation (no thread row
  // yet) still shows the recipient's name in the header.
  const activeThread =
    (threads.data ?? []).find((t) => t.partner_id === active) ??
    (active && active === initialPartnerId
      ? { partner_id: active, partner_name: initialPartnerName ?? null, last_body: "", last_at: "", unread: 0 }
      : null);

  const send = async () => {
    if (!active || !text.trim()) return;
    setSendErr(null);
    try {
      const m = await sendMessage(active, text.trim());
      setMsgs((prev) => [...prev, m]);
      setText("");
      listThreads().then(threads.setData);
    } catch (e) {
      setSendErr(e instanceof ApiError ? e.message : "Couldn't send message.");
    }
  };

  const list = threads.data ?? [];

  return (
    <>
      <TopBar title="Messages" search="Search" avatarLetter={avatarLetter} />
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Conversation list — hidden on mobile when a thread is open */}
          <div
            className={`w-full flex-none flex-col border-r border-border bg-cream md:flex md:w-[300px] ${
              active ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <Label>Conversations</Label>
              {list.length > 0 && <span className="of-eyebrow">{list.length}</span>}
            </div>
            <div className="h-px bg-border" />
            <div className="flex-1 overflow-auto">
              {threads.error && <div className="px-5 py-3 text-[13px] text-coral">{threads.error}</div>}
              {threads.data != null && !threads.error && list.length === 0 && (
                <div className="p-5">
                  <EmptyState title="No conversations yet" icon="messages">
                    Messages with your specialist and clients will appear here.
                  </EmptyState>
                </div>
              )}
              {list.map((t) => {
                const on = active === t.partner_id;
                return (
                  <button
                    key={t.partner_id}
                    onClick={() => setActive(t.partner_id)}
                    className={`flex w-full items-center gap-3 border-b border-border px-5 py-4 text-left transition-colors ${
                      on ? "bg-paper" : "hover:bg-cream-deep"
                    }`}
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center border border-border bg-paper font-serif text-[15px] text-charcoal">
                      {initials(t.partner_name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-sans text-[14px] font-medium text-charcoal">
                          {t.partner_name ?? "Contact"}
                        </span>
                        <span className="flex-none font-sans text-[10px] text-muted">
                          {t.last_at ? relativeTime(t.last_at) : ""}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="truncate font-sans text-[12px] text-muted">{t.last_body}</span>
                        {t.unread > 0 && (
                          <span className="flex h-[16px] min-w-[16px] flex-none items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-charcoal">
                            {t.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thread pane */}
          <div className={`flex-1 flex-col bg-cream ${active ? "flex" : "hidden md:flex"}`}>
            {!active ? (
              <div className="flex h-full items-center justify-center p-9">
                <EmptyState title="Select a conversation" icon="messages">
                  Choose a conversation from the list to start messaging.
                </EmptyState>
              </div>
            ) : (
              <>
                <div className="flex flex-none items-center gap-3 border-b border-border bg-cream/85 px-5 py-3 backdrop-blur">
                  <button
                    type="button"
                    onClick={() => setActive(null)}
                    aria-label="Back"
                    className="flex h-8 w-8 items-center justify-center text-muted hover:text-charcoal md:hidden"
                  >
                    <Icon name="chevron" size={18} className="rotate-180" />
                  </button>
                  <span className="flex h-8 w-8 flex-none items-center justify-center border border-border bg-paper font-serif text-[14px] text-charcoal">
                    {initials(activeThread?.partner_name ?? null)}
                  </span>
                  <span className="font-sans text-[14px] font-semibold text-charcoal">
                    {activeThread?.partner_name ?? "Conversation"}
                  </span>
                </div>

                <div className="flex-1 space-y-2 overflow-auto p-5">
                  {msgs.length === 0 && (
                    <div className="py-10 text-center font-sans text-[13px] text-muted">
                      No messages yet — say hello.
                    </div>
                  )}
                  {msgs.map((m) => {
                    const mine = m.sender_id !== active;
                    return (
                      <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[78%] border px-3.5 py-2 font-sans text-[14px] leading-snug ${
                            mine
                              ? "border-coral bg-coral-soft text-charcoal"
                              : "border-border bg-paper text-charcoal"
                          }`}
                        >
                          {m.body}
                          <div className={`mt-1 text-[10px] ${mine ? "text-warm-red/70" : "text-muted"}`}>
                            {relativeTime(m.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {sendErr && <div className="px-5 pb-1 text-[13px] text-coral">{sendErr}</div>}
                <div className="flex flex-none items-end gap-3 border-t border-border bg-cream p-4">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message…"
                    onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                    className="h-[42px] flex-1 border border-border bg-paper px-3 text-[14px] outline-none transition-all focus:border-charcoal focus:ring-2 focus:ring-coral/15"
                  />
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
