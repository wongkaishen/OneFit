import React, { useEffect, useState } from "react";
import WebShell from "../WebShell";
import { WLabel, WButton, WBadge, WHairline, WProgress, WBarChart } from "../WebPrimitives";
import { WELLNESS_NAV } from "./ClientList";
import {
  getClientActivity,
  getClientDiet,
  getClientProgress,
  submitFeedback,
} from "../../api/specialist";

function ActivityLogRow({ name, date, meta }) {
  return (
    <div style={{ padding: "14px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--charcoal)" }}>
          {name}
        </span>
        <WLabel>{date}</WLabel>
      </div>
      <div style={{ marginTop: 5, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--muted)" }}>
        {meta}
      </div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function activityMeta(log) {
  const parts = [];
  if (log.duration != null) parts.push(`${log.duration} min`);
  if (log.calories_burned != null) parts.push(`${Math.round(Number(log.calories_burned))} kcal`);
  if (log.steps != null) parts.push(`${log.steps} steps`);
  if (log.heart_rate != null) parts.push(`${log.heart_rate} bpm`);
  return parts.join(" · ") || "—";
}

export default function ClientDetail({ client, onBack, onNav }) {
  const c = client || { name: "Client", goal: "—", user_id: null };
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ kind: "idle", message: "" });
  const [activity, setActivity] = useState([]);
  const [diet, setDiet] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!c.user_id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.allSettled([
      getClientActivity(c.user_id, 10),
      getClientDiet(c.user_id, 10),
      getClientProgress(c.user_id, 8),
    ])
      .then(([a, d, p]) => {
        if (cancelled) return;
        setActivity(a.status === "fulfilled" && Array.isArray(a.value) ? a.value : []);
        setDiet(d.status === "fulfilled" && Array.isArray(d.value) ? d.value : []);
        setProgress(p.status === "fulfilled" && Array.isArray(p.value) ? p.value : []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [c.user_id]);

  const send = async (planUpdated) => {
    if (!notes.trim()) {
      setStatus({ kind: "err", message: "Add notes before submitting." });
      return;
    }
    if (!c.user_id) {
      setStatus({ kind: "err", message: "Client has no user_id (open from list)." });
      return;
    }
    setBusy(true);
    try {
      await submitFeedback({
        user_id: c.user_id,
        notes: notes.trim(),
        plan_updated: planUpdated,
      });
      setStatus({
        kind: "ok",
        message: planUpdated
          ? "Feedback sent and plan marked updated. Client notified."
          : "Note saved. Client notified.",
      });
      setNotes("");
    } catch (e) {
      setStatus({ kind: "err", message: e.detail || "Failed to submit feedback." });
    } finally {
      setBusy(false);
    }
  };

  // Oldest first for the chart, take up to 7 entries.
  const weightSeries = progress
    .filter((p) => p.weight != null)
    .slice(0, 7)
    .reverse()
    .map((p, i) => ({
      v: Number(p.weight),
      label: new Date(p.recorded_at).toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
    }));
  const currentWeight = weightSeries.length ? weightSeries[weightSeries.length - 1].v : null;
  const firstWeight = weightSeries.length ? weightSeries[0].v : null;
  const weightDelta = currentWeight != null && firstWeight != null ? +(currentWeight - firstWeight).toFixed(1) : null;

  const todayKcal = diet
    .filter((d) => d.log_date === new Date().toISOString().slice(0, 10))
    .reduce((sum, d) => sum + Number(d.calories || 0), 0);

  const displayName = c.name || c.email || "Client";

  return (
    <WebShell
      nav={WELLNESS_NAV}
      active="Clients"
      role="Wellness Specialist"
      title="Client"
      search="Search clients"
      onNav={onNav}
    >
      <div style={{ padding: "26px 36px" }}>
        <span
          onClick={onBack}
          style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--muted)", cursor: "pointer" }}
        >
          ‹ Back to clients
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "20px 0 26px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: "1px solid var(--charcoal)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-serif)",
                fontSize: 26,
                color: "var(--charcoal)",
              }}
            >
              {displayName[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 26, color: "var(--charcoal)" }}>
                {displayName}
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 16 }}>
                <WLabel>Goal · {c.goal || "—"}</WLabel>
                <WBadge tone="good">Active</WBadge>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <WButton variant="ghost" size="sm" onClick={busy ? undefined : () => send(false)}>
              {busy ? "Sending…" : "Send note"}
            </WButton>
            <WButton variant="primary" size="sm" onClick={busy ? undefined : () => send(true)}>
              {busy ? "Sending…" : "Update plan"}
            </WButton>
          </div>
        </div>

        <WHairline />

        <div className="cd-cols" style={{ marginTop: 26 }}>
          {/* Left column */}
          <div style={{ paddingRight: 32, borderRight: "1px solid var(--border)" }}>
            <WLabel>Weight trend · last {weightSeries.length || 0} entries</WLabel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "12px 0 18px" }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 36, color: "var(--charcoal)" }}>
                {currentWeight != null ? currentWeight.toFixed(1) : "—"}
              </span>
              {weightDelta != null && (
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: "0.5px",
                    color: "var(--coral)",
                  }}
                >
                  {weightDelta > 0 ? "↑" : "↓"} {Math.abs(weightDelta).toFixed(1)} KG
                </span>
              )}
            </div>
            {weightSeries.length > 0 ? (
              <WBarChart data={weightSeries} height={110} />
            ) : (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>No weight entries yet.</div>
            )}

            <div style={{ marginTop: 26 }}>
              <WLabel>Recent activity</WLabel>
              <div style={{ marginTop: 6 }}>
                {loading && <div style={{ fontSize: 12, color: "var(--muted)" }}>Loading…</div>}
                {!loading && activity.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>No activity logged yet.</div>
                )}
                {activity.slice(0, 6).map((a, i) => (
                  <React.Fragment key={a.log_id || i}>
                    <ActivityLogRow
                      name={a.workout_type || "Activity"}
                      date={fmtDate(a.log_date)}
                      meta={activityMeta(a)}
                    />
                    <WHairline />
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Middle column */}
          <div style={{ padding: "0 32px", borderRight: "1px solid var(--border)" }}>
            <WLabel>Today's nutrition</WLabel>
            <div
              style={{
                marginTop: 12,
                marginBottom: 4,
                fontFamily: "var(--font-serif)",
                fontSize: 38,
                color: "var(--charcoal)",
              }}
            >
              {Math.round(todayKcal).toLocaleString()}
            </div>
            <div style={{ marginBottom: 22, fontSize: 12, color: "var(--muted)" }}>
              kcal consumed today
            </div>
            <WHairline />
            <div style={{ marginTop: 16 }}>
              <WLabel>Recent meals</WLabel>
              {loading && <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>Loading…</div>}
              {!loading && diet.length === 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>No meals logged yet.</div>
              )}
              {diet.slice(0, 6).map((d, i) => (
                <div key={d.log_id || i} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "var(--charcoal)" }}>
                      {d.food_item || d.meal_time || "Meal"}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {Math.round(Number(d.calories || 0))} kcal
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                    {fmtDate(d.log_date)}
                    {d.meal_time ? ` · ${d.meal_time}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div style={{ paddingLeft: 32 }}>
            <WLabel>Specialist notes</WLabel>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write feedback or observations for this client…"
              rows={7}
              style={{
                marginTop: 14,
                width: "100%",
                background: "var(--white)",
                border: "1px solid var(--border)",
                padding: 12,
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--charcoal)",
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
              }}
            />
            {status.kind !== "idle" && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: status.kind === "ok" ? "var(--charcoal)" : "var(--coral)",
                }}
              >
                {status.message}
              </div>
            )}
            <WHairline style={{ margin: "22px 0" }} />
            <WLabel>Body metrics</WLabel>
            <div style={{ marginTop: 12, fontSize: 13, color: "var(--charcoal)", lineHeight: 1.9 }}>
              <div>Weight · {c.weight != null ? `${c.weight} kg` : "—"}</div>
              <div>Body fat · {c.body_fat_percent != null ? `${c.body_fat_percent}%` : "—"}</div>
              <div>Last active · {c.last_active_at ? fmtDate(c.last_active_at) : "—"}</div>
            </div>
          </div>
        </div>
      </div>
    </WebShell>
  );
}
