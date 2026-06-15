"use client";
import React from "react";
import { useRouter } from "next/navigation";
import WebShell, { WAvatar } from "./WebShell";
import { useAuth } from "../auth/useAuth";

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
export default function GymShell({ active, title, search = "Search", children }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const initial = (user?.name?.[0] ?? "A").toUpperCase();

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
        <span onClick={signOut} title="Sign out" style={{ cursor: "pointer" }}>
          <WAvatar letter={initial} />
        </span>
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
