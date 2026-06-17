"use client";
import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { useResource } from "@/lib/api/useResource";
import { listNotifications, markNotificationRead } from "@/lib/api/notifications";
import { relativeTime } from "@/lib/format";
import type { NotificationOut } from "@/lib/api/types";

const FILTERS = ["All", "Unread", "Announcements"] as const;
type Filter = (typeof FILTERS)[number];

/** Full-page notifications list, shared across all role shells. */
export function NotificationsPage({ avatarLetter = "?" }: { avatarLetter?: string }) {
  const fetcher = useCallback(() => listNotifications(), []);
  const { data, error, loading, setData } = useResource<NotificationOut[]>(fetcher, []);
  const params = useSearchParams();
  const initial = params.get("filter");
  const [filter, setFilter] = useState<Filter>(
    FILTERS.includes(initial as Filter) ? (initial as Filter) : "All",
  );

  const items = (data ?? []).filter((n) => {
    if (filter === "Unread") return n.status === "unread";
    if (filter === "Announcements") return n.type === "announcement";
    return true;
  });
  const unread = (data ?? []).filter((n) => n.status === "unread");

  const [selected, setSelected] = useState<NotificationOut | null>(null);

  const markRead = async (id: string) => {
    try {
      const updated = await markNotificationRead(id);
      setData((prev) => (prev ?? []).map((n) => (n.notification_id === id ? updated : n)));
    } catch {
      /* leave unread on failure */
    }
  };

  const markAll = async () => {
    for (const n of unread) await markRead(n.notification_id);
  };

  // Open the full notification/announcement; mark it read on open.
  const open = (n: NotificationOut) => {
    setSelected(n);
    if (n.status === "unread") void markRead(n.notification_id);
  };

  // First line is the title (announcements are "title\n\nbody"); the rest is the body.
  const [selTitle, ...selRest] = (selected?.message ?? "").split("\n");
  const selBody = selRest.join("\n").trim();

  return (
    <>
      <TopBar title="Notifications" search="Search" avatarLetter={avatarLetter} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[720px] px-9 py-[30px]">
          <div className="mb-[18px] flex items-center justify-between">
            <div className="flex gap-[10px]">
              {FILTERS.map((f) => (
                <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
                  {f === "Unread" ? `Unread (${unread.length})` : f}
                </Chip>
              ))}
            </div>
            {unread.length > 0 && (
              <Button variant="ghost" size="sm" onClick={markAll}>
                Mark all read
              </Button>
            )}
          </div>

          <Hairline />

          {loading && <div className="py-8"><Label>Loading…</Label></div>}
          {error && <div className="py-8 text-[13px] text-coral">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="py-10 text-center font-sans text-[13px] text-muted">
              {filter === "Unread"
                ? "No unread notifications"
                : filter === "Announcements"
                  ? "No announcements yet"
                  : "No notifications yet"}
            </div>
          )}

          {items.map((n) => (
            <div key={n.notification_id}>
              <div
                onClick={() => open(n)}
                className="flex cursor-pointer items-start gap-4 py-4 hover:bg-white"
              >
                <span
                  className="mt-[7px] h-[7px] w-[7px] flex-none rounded-full"
                  style={{ background: n.status === "unread" ? "var(--coral)" : "var(--border)" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-sans text-[10px] uppercase tracking-label text-muted">
                    {n.type}
                  </div>
                  <div className="whitespace-pre-line font-sans text-[14px] leading-snug text-charcoal">{n.message}</div>
                </div>
                <Label>{relativeTime(n.sent_at)}</Label>
              </div>
              <Hairline />
            </div>
          ))}
        </div>
      </main>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/30 px-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[520px] border border-border bg-cream p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="font-sans text-[10px] uppercase tracking-label text-muted">
                {selected.type}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="font-sans text-[18px] leading-none text-muted hover:text-charcoal"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="mt-2 font-serif text-[22px] leading-tight text-charcoal">
              {selTitle}
            </div>
            {selBody && (
              <div className="mt-4 whitespace-pre-line font-sans text-[14px] leading-relaxed text-subtle">
                {selBody}
              </div>
            )}
            <div className="mt-6 font-sans text-[11px] text-muted">
              {relativeTime(selected.sent_at)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
