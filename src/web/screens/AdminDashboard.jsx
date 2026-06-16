import React from "react";
import WebShell, { WAvatar } from "../WebShell";
import { WLabel, WHairline } from "../WebPrimitives";

export const ADMIN_NAV = ["Users", "Content", "Reports", "Settings"];

const KPIS = [
  { label: "Total users", value: "12,480", sub: "+184 this week" },
  { label: "Wellness specialists", value: "86", sub: "71 active today" },
  { label: "Daily logins", value: "4,213", sub: "34% of base" },
  { label: "System health", value: "99.9%", sub: "All services nominal" },
];

const FEED = [
  { who: "Jordan M.", action: "published a plan for", target: "Alex Tan", time: "2m ago" },
  { who: "System", action: "completed", target: "nightly backup", time: "18m ago" },
  { who: "Priya N.", action: "was assigned to specialist", target: "Lena V.", time: "40m ago" },
  { who: "Admin", action: "archived program", target: "Couch to 5K v1", time: "1h ago" },
  { who: "Devin B.", action: "upgraded to", target: "Coaching tier", time: "2h ago" },
  { who: "System", action: "flagged", target: "3 inactive accounts", time: "3h ago" },
];

function KpiCard({ label, value, sub, last }) {
  return (
    <div
      style={{
        padding: "20px 22px",
        borderRight: last ? "none" : "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <WLabel>{label}</WLabel>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: 32,
          color: "var(--charcoal)",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 12, color: "var(--muted)" }}>{sub}</span>
    </div>
  );
}

function FeedRow({ who, action, target, time }) {
  return (
    <div
      style={{
        padding: "15px 0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ width: 6, height: 6, background: "var(--border)" }} />
        <span style={{ fontSize: 13, color: "var(--charcoal)" }}>
          <strong style={{ fontWeight: 600 }}>{who}</strong> {action}{" "}
          <span style={{ color: "var(--subtle)" }}>{target}</span>
        </span>
      </div>
      <WLabel>{time}</WLabel>
    </div>
  );
}

export default function AdminDashboard({ onNav }) {
  return (
    <WebShell
      nav={ADMIN_NAV}
      active="Users"
      role="Administrator"
      accent="var(--charcoal)"
      title="Dashboard"
      search="Search"
      topRight={<WAvatar letter="S" />}
      onNav={onNav}
    >
      <div style={{ padding: "30px 36px" }}>
        <WLabel>System overview · live</WLabel>
        <div className="adm-kpi" style={{ marginTop: 16, border: "1px solid var(--border)" }}>
          {KPIS.map((k, i) => (
            <KpiCard key={k.label} {...k} last={i === KPIS.length - 1} />
          ))}
        </div>

        <div style={{ marginTop: 34, display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <WLabel>Recent activity</WLabel>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>View all →</span>
        </div>
        <WHairline />
        {FEED.map((f, i) => (
          <React.Fragment key={i}>
            <FeedRow {...f} />
            <WHairline />
          </React.Fragment>
        ))}
      </div>
    </WebShell>
  );
}
