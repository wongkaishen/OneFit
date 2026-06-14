import React, { useState } from "react";
import WebShell from "../WebShell";
import { WAvatar } from "../WebShell";
import { WLabel, WButton, WChip, WBadge, WHairline, WProgress } from "../WebPrimitives";

export const WELLNESS_NAV = ["Clients", "Plans", "Messages", "Reports"];

const CLIENTS = [
  { name: "Alex Tan", active: "2h ago", goal: "Lose fat", pct: 73, alert: null },
  { name: "Mara Okafor", active: "Today", goal: "Build muscle", pct: 54, alert: "Missed 2 sessions" },
  { name: "Devin Brooks", active: "1d ago", goal: "Endurance", pct: 88, alert: null },
  { name: "Priya Nair", active: "3h ago", goal: "Lose fat", pct: 41, alert: "Below water goal" },
  { name: "Sam Whitfield", active: "5d ago", goal: "Maintain", pct: 12, alert: "Inactive 5 days" },
  { name: "Lena Vasquez", active: "Today", goal: "Build muscle", pct: 67, alert: null },
  { name: "Theo Holt", active: "6h ago", goal: "Endurance", pct: 79, alert: null },
];

const FILTERS = ["All clients", "On track", "At risk", "New this week"];
const GRID = "2fr 1fr 1.4fr 1.6fr 1.6fr";

export default function ClientList({ onOpenClient, onNav }) {
  const [filter, setFilter] = useState("All clients");

  return (
    <WebShell
      nav={WELLNESS_NAV}
      active="Clients"
      role="Wellness Specialist"
      title="Clients"
      search="Search clients"
      topRight={<WAvatar letter="J" />}
      onNav={onNav}
    >
      <div style={{ padding: "30px 36px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <WLabel>Your roster · 24 active</WLabel>
            <div
              style={{
                marginTop: 8,
                fontFamily: "var(--font-serif)",
                fontSize: 26,
                fontWeight: 400,
                color: "var(--charcoal)",
                whiteSpace: "nowrap",
              }}
            >
              Good to see you, Jordan.
            </div>
          </div>
          <WButton variant="primary" size="sm">
            + Add client
          </WButton>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 26, marginBottom: 18 }}>
          {FILTERS.map((f) => (
            <WChip key={f} active={f === filter} onClick={() => setFilter(f)}>
              {f}
            </WChip>
          ))}
        </div>

        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: GRID,
              padding: "0 4px 10px",
              gap: 10,
            }}
          >
            <WLabel>Client</WLabel>
            <WLabel>Last active</WLabel>
            <WLabel>Current goal</WLabel>
            <WLabel>Progress</WLabel>
            <WLabel>Alerts</WLabel>
          </div>
          <WHairline />
          {CLIENTS.map((c) => (
            <React.Fragment key={c.name}>
              <div
                onClick={() => onOpenClient?.(c)}
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID,
                  alignItems: "center",
                  padding: "18px 4px",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <WAvatar letter={c.name[0]} />
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 16,
                      color: "var(--charcoal)",
                    }}
                  >
                    {c.name}
                  </span>
                </div>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{c.active}</span>
                <span style={{ fontSize: 13, color: "var(--subtle)" }}>{c.goal}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <WProgress pct={c.pct} width={90} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: "var(--charcoal)" }}>
                    {c.pct}%
                  </span>
                </div>
                <div>
                  {c.alert ? (
                    <WBadge tone="warn">{c.alert}</WBadge>
                  ) : (
                    <span style={{ color: "var(--border)", fontSize: 12 }}>—</span>
                  )}
                </div>
              </div>
              <WHairline />
            </React.Fragment>
          ))}
        </div>
      </div>
    </WebShell>
  );
}
