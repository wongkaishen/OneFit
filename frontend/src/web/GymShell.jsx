"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WebShell, { WAvatar } from "./WebShell";
import { useAuth } from "../auth/useAuth";
import { listNotifications } from "../api/notifications";

// Gym User navigation — label shown in the sidebar -> route it pushes to.
export const GYM_NAV = [
  { label: "Home", path: "/dashboard" },
  { label: "Train", path: "/activity" },
  { label: "Eat", path: "/diet" },
  { label: "Progress", path: "/progress" },
  { label: "Plan", path: "/plan" },
  { label: "Schedule", path: "/calendar" },
  { label: "Profile", path: "/profile" },
];

const LABELS = GYM_NAV.map((n) => n.label);
const ROUTE_BY_LABEL = Object.fromEntries(GYM_NAV.map((n) => [n.label, n.path]));

// Shared shell for every Gym User screen. Consistent sidebar (matches the
// Wellness Specialist / Admin dashboards), responsive: rail on desktop,
// drawer on mobile.
function NotificationBell({ count, onClick }) {
  return (
    <span
      onClick={onClick}
      title="Notifications"
      style={{
        position: "relative",
        display: "inline-flex",
        width: 34,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: 16,
        color: "var(--charcoal)",
      }}
    >
      🔔
      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            borderRadius: 8,
            background: "var(--coral)",
            color: "var(--charcoal)",
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </span>
  );
}

export default function GymShell({ active, title, search = "Search", children }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const initial = (user?.name?.[0] ?? "A").toUpperCase();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listNotifications()
      .then((r) => {
        if (cancelled) return;
        const n = Array.isArray(r) ? r.filter((x) => x.status === "unread").length : 0;
        setUnread(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = () => {
    logout();
    router.replace("/login");
  };

  return (
    <WebShell
      nav={LABELS}
      active={active}
      role="Gym User"
      accent="var(--coral)"
      title={title}
      search={search}
      topRight={
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <NotificationBell count={unread} onClick={() => router.push("/notifications")} />
          <span onClick={signOut} title="Sign out" style={{ cursor: "pointer" }}>
            <WAvatar letter={initial} />
          </span>
        </div>
      }
      onNav={(label) => {
        const path = ROUTE_BY_LABEL[label];
        if (path) router.push(path);
      }}
    >
      {children}
    </WebShell>
  );
}
