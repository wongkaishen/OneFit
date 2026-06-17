"use client";
import React from "react";
import { useRouter, usePathname } from "next/navigation";

const TABS = [
  { id: "Home", path: "/dashboard" },
  { id: "Train", path: "/activity" },
  { id: "Eat", path: "/diet" },
  { id: "Stats", path: "/progress" },
];

export default function TabBar() {
  const router = useRouter();
  const path = usePathname();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "14px 36px 22px",
        borderTop: "1px solid var(--border)",
        background: "var(--cream)",
      }}
    >
      {TABS.map((t) => {
        const active = path === t.path;
        return (
          <div
            key={t.id}
            onClick={() => router.push(t.path)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: active ? "var(--coral)" : "transparent",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 9,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: active ? "var(--coral)" : "var(--muted)",
              }}
            >
              {t.id}
            </span>
          </div>
        );
      })}
    </div>
  );
}
