"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GymShell from "../../web/GymShell";
import { WLabel, WProgress, WButton, WBadge } from "../../web/WebPrimitives";
import { getDashboard } from "../../api/gymUser";

function Kpi({ label, value, unit, pct }) {
  return (
    <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
      <WLabel>{label}</WLabel>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontFamily: "var(--font-numeral)",
            fontWeight: 700,
            fontSize: 34,
            color: "var(--charcoal)",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {unit && <span style={{ fontSize: 12, color: "var(--muted)" }}>{unit}</span>}
      </div>
      {pct != null && <WProgress pct={pct * 100} width="100%" />}
    </div>
  );
}

function SessionRow({ time, name, tag, next }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "16px 0",
        borderBottom: "1px solid var(--border)",
        borderLeft: next ? "3px solid var(--coral)" : "3px solid transparent",
        paddingLeft: next ? 14 : 3,
        background: next ? "var(--white)" : "transparent",
      }}
    >
      <span style={{ width: 44, fontSize: 12, color: "var(--muted)" }}>{time}</span>
      <span style={{ flex: 1, fontSize: 14, color: "var(--charcoal)" }}>{name}</span>
      {next ? (
        <WBadge tone="warn">Next</WBadge>
      ) : (
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{tag}</span>
      )}
    </div>
  );
}

const FALLBACK = {
  greeting: "Welcome.",
  date_label: "TODAY",
  streak_days: 0,
  steps: { value: 0, goal: 10000 },
  calories: 0,
  water_litres: 0,
  today_sessions: [],
};

const QUICK_ACTIONS = [
  { label: "Log activity", path: "/activity" },
  { label: "Log diet", path: "/diet" },
  { label: "Update progress", path: "/progress" },
  { label: "Create plan", path: "/plan" },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const d = {
    ...FALLBACK,
    ...(data ?? {}),
    steps: { ...FALLBACK.steps, ...(data?.steps ?? {}) },
    today_sessions: data?.today_sessions ?? FALLBACK.today_sessions,
  };
  const stepPct = d.steps.goal > 0 ? d.steps.value / d.steps.goal : 0;

  return (
    <GymShell active="Home" title="Dashboard" search="Search your day">
      {loading ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 12,
          }}
        >
          Loading…
        </div>
      ) : (
        <div style={{ padding: "30px 36px", maxWidth: 1100 }}>
          {/* Greeting */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <WLabel>{d.date_label}</WLabel>
            {d.streak_days > 0 && <WBadge tone="warn">{d.streak_days}-day streak</WBadge>}
          </div>
          <h1
            style={{
              margin: "12px 0 28px",
              fontFamily: "var(--font-greeting)",
              fontWeight: 400,
              fontSize: 30,
              letterSpacing: "-0.5px",
              color: "var(--charcoal)",
              lineHeight: 1.1,
            }}
          >
            {d.greeting}
          </h1>

          {/* KPI strip */}
          <div className="og-kpi">
            <Kpi
              label="Steps"
              value={d.steps.value.toLocaleString()}
              unit={`/ ${d.steps.goal.toLocaleString()}`}
              pct={stepPct}
            />
            <Kpi label="Calories" value={String(d.calories)} unit="kcal" />
            <Kpi label="Water" value={String(d.water_litres)} unit="L" />
          </div>

          {/* Two columns: Today + Quick actions */}
          <div className="og-cols" style={{ marginTop: 36 }}>
            <div>
              <WLabel>Today</WLabel>
              <div style={{ marginTop: 14, borderTop: "1px solid var(--border)" }}>
                {d.today_sessions.length === 0 && (
                  <div style={{ padding: "16px 0", fontSize: 13, color: "var(--muted)" }}>
                    Nothing scheduled today.
                  </div>
                )}
                {d.today_sessions.map((s, i) => (
                  <SessionRow key={i} {...s} next={s.next ?? s.isNext} />
                ))}
              </div>
            </div>

            <div>
              <WLabel>Quick actions</WLabel>
              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {QUICK_ACTIONS.map((a) => (
                  <WButton key={a.path} variant="ghost" onClick={() => router.push(a.path)}>
                    {a.label}
                  </WButton>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </GymShell>
  );
}
