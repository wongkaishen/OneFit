"use client";
import React, { useEffect, useState } from "react";
import GymShell from "../../web/GymShell";
import { WLabel, WBadge, WHairline } from "../../web/WebPrimitives";
import { listNotifications, markRead } from "../../api/notifications";

function timeAgo(ts) {
  if (!ts) return "";
  const ms = Date.now() - new Date(ts).getTime();
  if (Number.isNaN(ms)) return ts;
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export default function NotificationsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNotifications()
      .then((r) => setItems(Array.isArray(r) ? r : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const open = async (n) => {
    if (n.status === "read") return;
    // UC10: opening a notification marks it read.
    setItems((prev) =>
      prev.map((x) => (x.notification_id === n.notification_id ? { ...x, status: "read" } : x))
    );
    try {
      await markRead(n.notification_id);
    } catch {
      /* ignore */
    }
  };

  const unread = items.filter((n) => n.status === "unread").length;

  return (
    <GymShell active="Home" title="Notifications" search="Search notifications">
      <div style={{ padding: "30px 36px", maxWidth: 720 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <WLabel>Inbox</WLabel>
          {unread > 0 && <WBadge tone="warn">{unread} unread</WBadge>}
        </div>

        {loading && (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
            Loading…
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            You're all caught up.
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <WHairline />
          {items.map((n) => {
            const isUnread = n.status === "unread";
            return (
              <div
                key={n.notification_id}
                onClick={() => open(n)}
                style={{
                  padding: "16px 4px",
                  borderBottom: "1px solid var(--border)",
                  borderLeft: isUnread ? "3px solid var(--coral)" : "3px solid transparent",
                  paddingLeft: isUnread ? 14 : 7,
                  cursor: isUnread ? "pointer" : "default",
                  display: "flex",
                  gap: 14,
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontWeight: isUnread ? 600 : 400,
                      fontSize: 13,
                      color: "var(--charcoal)",
                    }}
                  >
                    {n.message}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
                    {n.type}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {timeAgo(n.timestamp ?? n.sent_at)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </GymShell>
  );
}
