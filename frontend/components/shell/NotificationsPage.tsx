"use client";
import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody } from "@/components/shell/Page";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useResource } from "@/lib/api/useResource";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api/notifications";
import { relativeTime } from "@/lib/format";
import type { NotificationOut } from "@/lib/api/types";

/** Title/body for a notification, preferring structured fields and falling back
 *  to the legacy single `message` ("title\n\nbody"). */
function parts(n: NotificationOut): { title: string; body: string } {
  if (n.title) return { title: n.title, body: (n.body ?? "").trim() };
  const [first, ...rest] = (n.message ?? "").split("\n");
  return { title: first, body: rest.join("\n").trim() };
}

/** Where a notification deep-links, if anywhere, and the link label. */
function refLink(n: NotificationOut): { href: string; label: string } | null {
  if (n.ref_type === "meal_plan" && n.ref_id)
    return { href: `/gym/meal-plans?plan=${n.ref_id}`, label: "View meal plan →" };
  if (n.ref_type === "feedback" && n.ref_id)
    return { href: `/gym/feedback?id=${n.ref_id}`, label: "View feedback →" };
  if (n.ref_type === "milestone")
    return { href: `/gym/progress`, label: "View progress →" };
  return null;
}

const FILTERS = ["All", "Unread", "Announcements"] as const;
type Filter = (typeof FILTERS)[number];

/** Full-page notifications list, shared across all role shells. */
export function NotificationsPage({
  avatarLetter = "?",
  topSlot,
}: {
  avatarLetter?: string;
  topSlot?: React.ReactNode;
}) {
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
    try {
      await markAllNotificationsRead();
      setData((prev) => (prev ?? []).map((n) => ({ ...n, status: "read" })));
    } catch {
      /* leave unread on failure */
    }
  };

  // Open the full notification/announcement; mark it read on open.
  const open = (n: NotificationOut) => {
    setSelected(n);
    if (n.status === "unread") void markRead(n.notification_id);
  };

  const sel = selected ? parts(selected) : null;
  const selLink = selected ? refLink(selected) : null;

  return (
    <>
      <TopBar title="Notifications" search="Search" avatarLetter={avatarLetter} />
      <PageBody max="form">
          {topSlot}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-[10px]">
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

          <Card padded={false}>
          {loading && <div className="p-8"><Label>Loading…</Label></div>}
          {error && <div className="p-8 text-[13px] text-coral">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="py-12 text-center font-sans text-[13px] text-muted">
              {filter === "Unread"
                ? "No unread notifications"
                : filter === "Announcements"
                  ? "No announcements yet"
                  : "No notifications yet"}
            </div>
          )}

          {items.map((n, i) => (
            <div key={n.notification_id}>
              {i > 0 && <Hairline />}
              <div
                onClick={() => open(n)}
                className={`flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors hover:bg-cream-deep ${
                  n.status === "unread" ? "bg-coral-soft/40" : ""
                }`}
              >
                <span
                  className="mt-[7px] h-[7px] w-[7px] flex-none rounded-full"
                  style={{ background: n.status === "unread" ? "var(--coral)" : "var(--border-strong)" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-sans text-[10px] uppercase tracking-label text-muted">
                    {n.type}
                  </div>
                  <div className="truncate font-sans text-[14px] leading-snug text-charcoal">
                    {parts(n).title}
                  </div>
                </div>
                <Label>{relativeTime(n.sent_at)}</Label>
              </div>
            </div>
          ))}
          </Card>
      </PageBody>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 px-6 backdrop-blur-[2px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[520px] animate-fade-in border border-border bg-cream p-7 shadow-pop"
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
              {sel?.title}
            </div>
            {sel?.body && (
              <div className="mt-4 whitespace-pre-line font-sans text-[14px] leading-relaxed text-subtle">
                {sel.body}
              </div>
            )}
            {selLink && (
              <Link
                href={selLink.href}
                onClick={() => setSelected(null)}
                className="mt-5 inline-block font-sans text-[13px] font-semibold text-coral underline"
              >
                {selLink.label}
              </Link>
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
