import React, { useEffect, useMemo, useState } from "react";
import WebShell from "../WebShell";
import { WAvatar } from "../WebShell";
import { WLabel, WButton, WChip, WBadge, WHairline, WProgress } from "../WebPrimitives";
import { listClients } from "../../api/specialist";

export const WELLNESS_NAV = ["Clients", "Plans", "Messages", "Reports"];

const FILTERS = ["All clients", "On track", "At risk", "New this week"];
const GRID = "2fr 1fr 1.4fr 1.6fr 1.6fr";

function daysSince(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function activeLabel(iso) {
  if (!iso) return "No activity yet";
  const days = daysSince(iso);
  if (days === null) return iso;
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function alertFor(iso) {
  const days = daysSince(iso);
  if (days === null) return "No activity yet";
  if (days >= 7) return `Inactive ${days} days`;
  return null;
}

// Engagement score: 100 if active today, decaying to 0 after 14 days.
function engagement(iso) {
  const days = daysSince(iso);
  if (days === null) return 0;
  return Math.max(0, Math.min(100, Math.round(100 - (days * 100) / 14)));
}

export default function ClientList({ onOpenClient, onNav }) {
  const [filter, setFilter] = useState("All clients");
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listClients()
      .then((rows) => setClients(Array.isArray(rows) ? rows : []))
      .catch((e) => setError(e?.detail || "Failed to load clients"))
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    if (filter === "On track") return clients.filter((c) => engagement(c.last_active_at) >= 70);
    if (filter === "At risk") return clients.filter((c) => alertFor(c.last_active_at));
    if (filter === "New this week") {
      const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return clients.filter((c) => !c.last_active_at || new Date(c.last_active_at).getTime() >= week);
    }
    return clients;
  }, [clients, filter]);

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
            <WLabel>Your roster · {clients.length} {clients.length === 1 ? "client" : "clients"}</WLabel>
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
              Good to see you.
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

        <div className="ws-tablewrap">
         <div className="ws-table">
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
            <WLabel>Engagement</WLabel>
            <WLabel>Alerts</WLabel>
          </div>
          <WHairline />

          {loading && (
            <div style={{ padding: "28px 4px", fontSize: 13, color: "var(--muted)" }}>
              Loading clients…
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: "28px 4px", fontSize: 13, color: "var(--coral)" }}>{error}</div>
          )}
          {!loading && !error && list.length === 0 && (
            <div style={{ padding: "28px 4px", fontSize: 13, color: "var(--muted)" }}>
              No clients match this filter.
            </div>
          )}

          {list.map((c) => {
            const pct = engagement(c.last_active_at);
            const alert = alertFor(c.last_active_at);
            const display = c.name || c.email;
            return (
              <React.Fragment key={c.user_id}>
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
                    <WAvatar letter={(display || "?")[0].toUpperCase()} />
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 16,
                        color: "var(--charcoal)",
                      }}
                    >
                      {display}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>
                    {activeLabel(c.last_active_at)}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--subtle)" }}>{c.goal || "—"}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <WProgress pct={pct} width={90} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--charcoal)" }}>
                      {pct}%
                    </span>
                  </div>
                  <div>
                    {alert ? (
                      <WBadge tone="warn">{alert}</WBadge>
                    ) : (
                      <span style={{ color: "var(--border)", fontSize: 12 }}>—</span>
                    )}
                  </div>
                </div>
                <WHairline />
              </React.Fragment>
            );
          })}
         </div>
        </div>
      </div>
    </WebShell>
  );
}
