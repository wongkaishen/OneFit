import React, { useState } from "react";
import WebShell, { WAvatar } from "../WebShell";
import { WLabel, WChip, WBadge, WHairline } from "../WebPrimitives";
import { ADMIN_NAV } from "./AdminDashboard";

const USERS = [
  { name: "Alex Tan", role: "Member", joined: "Jan 2026", status: "Active", last: "2h ago" },
  { name: "Jordan Mills", role: "Specialist", joined: "Aug 2025", status: "Active", last: "Today" },
  { name: "Mara Okafor", role: "Member", joined: "Mar 2026", status: "Active", last: "Today" },
  { name: "Sam Whitfield", role: "Member", joined: "Nov 2025", status: "Suspended", last: "5d ago" },
  { name: "Lena Vasquez", role: "Specialist", joined: "Jun 2025", status: "Active", last: "1h ago" },
  { name: "Devin Brooks", role: "Member", joined: "Feb 2026", status: "Active", last: "1d ago" },
  { name: "Priya Nair", role: "Member", joined: "Apr 2026", status: "Pending", last: "3h ago" },
  { name: "Theo Holt", role: "Member", joined: "Dec 2025", status: "Active", last: "6h ago" },
];

const ROLES = ["All roles", "Members", "Specialists", "Admins"];
const STATUS_TONE = { Active: "good", Suspended: "flag", Pending: "neutral" };
const ACTIONS = ["Suspend", "Activate", "Export"];
const GRID = "32px 2fr 1.2fr 1.2fr 1.2fr 1fr 40px";

export default function UserManagement({ onNav }) {
  const [role, setRole] = useState("All roles");
  const [sel, setSel] = useState(new Set());
  const [menu, setMenu] = useState(null);

  const toggle = (i) => {
    const next = new Set(sel);
    next.has(i) ? next.delete(i) : next.add(i);
    setSel(next);
  };

  const hasSel = sel.size > 0;

  return (
    <WebShell
      nav={ADMIN_NAV}
      active="Users"
      role="Administrator"
      accent="var(--charcoal)"
      title="User management"
      search="Search users"
      topRight={<WAvatar letter="S" />}
      onNav={onNav}
    >
      <div style={{ padding: "30px 36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {ROLES.map((r) => (
              <WChip key={r} active={r === role} onClick={() => setRole(r)}>
                {r}
              </WChip>
            ))}
          </div>
          <WLabel>{USERS.length} users</WLabel>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 48,
            padding: "0 16px",
            marginBottom: 2,
            border: hasSel ? "none" : "1px solid var(--border)",
            background: hasSel ? "var(--charcoal)" : "transparent",
            color: hasSel ? "var(--cream)" : "var(--muted)",
            transition: "background .12s ease, color .12s ease, border .12s ease",
          }}
        >
          <span style={{ fontSize: 12 }}>
            {hasSel ? `${sel.size} selected` : "Select rows for bulk actions"}
          </span>
          <div style={{ display: "flex", gap: 18 }}>
            {ACTIONS.map((a) => (
              <span
                key={a}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: hasSel ? "var(--cream)" : "var(--border)",
                  cursor: hasSel ? "pointer" : "default",
                }}
              >
                {a}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: GRID,
            padding: "14px 4px 12px",
            gap: 10,
          }}
        >
          <span />
          <WLabel>Name ↓</WLabel>
          <WLabel>Role</WLabel>
          <WLabel>Joined</WLabel>
          <WLabel>Status</WLabel>
          <WLabel>Last active</WLabel>
          <span />
        </div>
        <WHairline />

        {USERS.map((u, i) => {
          const selected = sel.has(i);
          return (
            <React.Fragment key={u.name}>
              <div
                style={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: GRID,
                  alignItems: "center",
                  padding: "16px 4px",
                  gap: 10,
                  background: selected ? "var(--white)" : "transparent",
                }}
              >
                <span
                  onClick={() => toggle(i)}
                  style={{
                    width: 15,
                    height: 15,
                    border: "1px solid var(--subtle)",
                    background: selected ? "var(--charcoal)" : "transparent",
                    color: "var(--cream)",
                    fontSize: 11,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {selected ? "✓" : ""}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <WAvatar letter={u.name[0]} />
                  <span style={{ fontSize: 14, color: "var(--charcoal)" }}>{u.name}</span>
                </div>
                <span style={{ fontSize: 13, color: "var(--subtle)" }}>{u.role}</span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{u.joined}</span>
                <div>
                  <WBadge tone={STATUS_TONE[u.status]}>{u.status}</WBadge>
                </div>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{u.last}</span>
                <span
                  onClick={() => setMenu(menu === i ? null : i)}
                  style={{
                    fontSize: 18,
                    color: "var(--subtle)",
                    letterSpacing: 1,
                    cursor: "pointer",
                    textAlign: "right",
                  }}
                >
                  ⋯
                </span>

                {menu === i && (
                  <div
                    style={{
                      position: "absolute",
                      right: 8,
                      top: 50,
                      background: "var(--cream)",
                      border: "1px solid var(--border)",
                      zIndex: 20,
                      minWidth: 150,
                    }}
                  >
                    {[
                      "View profile",
                      u.status === "Suspended" ? "Activate" : "Suspend",
                      "Reset password",
                    ].map((opt) => (
                      <div
                        key={opt}
                        onClick={() => setMenu(null)}
                        style={{
                          padding: "11px 16px",
                          fontSize: 13,
                          color: "var(--charcoal)",
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                        }}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <WHairline />
            </React.Fragment>
          );
        })}
      </div>
    </WebShell>
  );
}
