import React, { useEffect, useState } from "react";
import WebShell, { WAvatar } from "../WebShell";
import { WLabel, WHairline } from "../WebPrimitives";
import { getAuditLog, getStats } from "../../api/admin";

export const ADMIN_NAV = ["Users", "Content", "Announcements", "Settings"];

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

function timeAgo(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso;
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function FeedRow({ entry }) {
  const who = entry.actor_name || "System";
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
          <strong style={{ fontWeight: 600 }}>{who}</strong> {entry.action.replace(/_/g, " ")}{" "}
          {entry.details && (
            <span style={{ color: "var(--subtle)" }}>{entry.details}</span>
          )}
        </span>
      </div>
      <WLabel>{timeAgo(entry.created_at)}</WLabel>
    </div>
  );
}

export default function AdminDashboard({ onNav }) {
  const [stats, setStats] = useState(null);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.allSettled([getStats(), getAuditLog(20)])
      .then(([s, f]) => {
        if (s.status === "fulfilled") setStats(s.value);
        else setError(s.reason?.detail || "Failed to load stats");
        if (f.status === "fulfilled" && Array.isArray(f.value)) setFeed(f.value);
      })
      .finally(() => setLoading(false));
  }, []);

  const kpis = stats
    ? [
        {
          label: "Total users",
          value: stats.total_users.toLocaleString(),
          sub: `${stats.pending_approvals} pending approvals`,
        },
        {
          label: "Wellness specialists",
          value: stats.total_specialists.toLocaleString(),
          sub: `${stats.total_admins} admins on platform`,
        },
        {
          label: "Active today",
          value: stats.active_today.toLocaleString(),
          sub: `${stats.total_gym_users.toLocaleString()} gym users`,
        },
        {
          label: "System health",
          value: "OK",
          sub: "API + DB responding",
        },
      ]
    : [];

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

        {loading && (
          <div style={{ marginTop: 16, padding: 24, color: "var(--muted)", fontSize: 13 }}>
            Loading…
          </div>
        )}
        {!loading && error && (
          <div style={{ marginTop: 16, padding: 24, color: "var(--coral)", fontSize: 13 }}>
            {error}
          </div>
        )}
        {!loading && stats && (
          <div className="adm-kpi" style={{ marginTop: 16, border: "1px solid var(--border)" }}>
            {kpis.map((k, i) => (
              <KpiCard key={k.label} {...k} last={i === kpis.length - 1} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 34, display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <WLabel>Recent activity</WLabel>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Latest audit entries</span>
        </div>
        <WHairline />
        {!loading && feed.length === 0 && (
          <div style={{ padding: "20px 0", fontSize: 13, color: "var(--muted)" }}>
            No audit activity yet.
          </div>
        )}
        {feed.map((entry) => (
          <React.Fragment key={entry.log_id}>
            <FeedRow entry={entry} />
            <WHairline />
          </React.Fragment>
        ))}
      </div>
    </WebShell>
  );
}
