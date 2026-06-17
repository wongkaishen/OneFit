"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { listNotifications, markNotificationRead } from "@/lib/api/notifications";
import { relativeTime } from "@/lib/format";
import type { NotificationOut } from "@/lib/api/types";

/** Map the current route to its role section so the bell links to the right notifications page. */
function notificationsHref(pathname: string | null): string {
  const base = pathname?.split("/")[1];
  if (base === "admin" || base === "specialist" || base === "gym") {
    return `/${base}/notifications`;
  }
  return "/gym/notifications";
}

// Notification bell shared across every role shell. Reads the caller's own
// feed from /notifications.
export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<NotificationOut[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Click a row: mark it read, then open the full notifications page (filtered for announcements). */
  const openNotification = (n: NotificationOut) => {
    if (n.status === "unread") void markRead(n.notification_id);
    setOpen(false);
    const href = notificationsHref(pathname);
    router.push(n.type === "announcement" ? `${href}?filter=Announcements` : href);
  };

  const load = useCallback(async () => {
    try {
      setItems(await listNotifications());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load notifications");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000); // light polling; no websocket layer yet
    return () => clearInterval(id);
  }, [load]);

  const unread = items.filter((n) => n.status === "unread").length;

  const markRead = async (id: string) => {
    try {
      const updated = await markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n.notification_id === id ? updated : n)));
    } catch {
      /* keep silent; the row just stays unread */
    }
  };

  const markAll = async () => {
    const unreadIds = items.filter((n) => n.status === "unread").map((n) => n.notification_id);
    for (const id of unreadIds) await markRead(id);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-[34px] w-[34px] items-center justify-center text-[16px] text-subtle hover:text-charcoal"
        aria-label="Notifications"
      >
        <span aria-hidden>◔</span>
        {unread > 0 && (
          <span className="absolute right-0 top-0 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold leading-none text-charcoal">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[42px] z-30 w-[320px] border border-border bg-cream">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-sans text-[11px] font-bold uppercase tracking-label text-muted">
              Notifications
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="font-sans text-[11px] text-charcoal underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-auto">
            {error && <div className="px-4 py-4 text-[12px] text-coral">{error}</div>}
            {!error && items.length === 0 && (
              <div className="px-4 py-6 text-center font-sans text-[12px] text-muted">
                No notifications yet
              </div>
            )}
            {items.map((n) => (
              <div
                key={n.notification_id}
                onClick={() => openNotification(n)}
                className="flex cursor-pointer gap-3 border-b border-border px-4 py-3 hover:bg-white"
              >
                <span
                  className="mt-[6px] h-[6px] w-[6px] flex-none rounded-full"
                  style={{ background: n.status === "unread" ? "var(--coral)" : "var(--border)" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-sans text-[10px] uppercase tracking-label text-muted">
                    {n.type}
                  </div>
                  <div className="line-clamp-3 whitespace-pre-line font-sans text-[13px] leading-snug text-charcoal">{n.message}</div>
                  <div className="mt-1 font-sans text-[11px] text-muted">
                    {relativeTime(n.sent_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
