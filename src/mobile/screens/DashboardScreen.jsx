"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark, Label, Hairline, Pill } from "../Primitives";
import { getDashboard } from "../../api/gymUser";
import { useAuth } from "../../auth/useAuth";
import TabBar from "../TabBar";

function StatRow({ name, value, unit, pct }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          padding: "16px 0 14px",
        }}
      >
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--charcoal)" }}>
          {name}
        </span>
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
          <span
            style={{
              fontFamily: "var(--font-numeral)",
              fontWeight: 700,
              fontSize: 18,
              color: "var(--charcoal)",
            }}
          >
            {value}
          </span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--muted)" }}>
            {unit}
          </span>
        </span>
      </div>
      {pct != null ? (
        <div style={{ height: 2, background: "var(--border)", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--coral)",
              transformOrigin: "left",
              animation: "onefit-bar-fill 900ms cubic-bezier(.22,1,.36,1) 180ms both",
              "--pct": pct,
            }}
          />
        </div>
      ) : (
        <Hairline />
      )}
    </div>
  );
}

function WorkoutRow({ time, name, tag, isNext, next }) {
  const [pressed, setPressed] = useState(false);
  const showNext = isNext ?? next;
  return (
    <div
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "16px 0 14px",
        paddingLeft: showNext ? 14 : 0,
        background: showNext ? "var(--white)" : "transparent",
        borderLeft: showNext ? "3px solid var(--coral)" : "3px solid transparent",
        marginLeft: showNext ? -16 : 0,
        marginRight: showNext ? -16 : 0,
        paddingRight: showNext ? 14 : 0,
        cursor: showNext ? "pointer" : "default",
        opacity: pressed && showNext ? 0.9 : 1,
        transform: pressed && showNext ? "scale(0.99)" : "none",
        transition: "opacity .12s ease, transform .12s ease",
      }}
    >
      <span style={{ width: 34, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--muted)" }}>
        {time}
      </span>
      <span style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--charcoal)" }}>
        {name}
      </span>
      {showNext ? (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 9,
            letterSpacing: "1.5px",
            color: "var(--coral)",
            textTransform: "uppercase",
          }}
        >
          NEXT
        </span>
      ) : (
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--muted)" }}>
          {tag}
        </span>
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

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
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
  const initial = (user?.name?.[0] ?? "A").toUpperCase();
  const stepPct = d.steps.goal > 0 ? d.steps.value / d.steps.goal : 0;

  const signOut = () => {
    logout();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          fontSize: 12,
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 30px 0",
        }}
      >
        <BrandMark />
        <div
          onClick={signOut}
          title="Sign out"
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "1px solid var(--charcoal)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--charcoal)",
            cursor: "pointer",
          }}
        >
          {initial}
        </div>
      </div>

      <div style={{ padding: "26px 30px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Label>{d.date_label}</Label>
          {d.streak_days > 0 && <Pill>{d.streak_days}-Day Streak</Pill>}
        </div>
        <h1
          style={{
            margin: "14px 0 0",
            fontFamily: "var(--font-greeting)",
            fontWeight: 400,
            fontSize: 22,
            letterSpacing: "-0.5px",
            color: "var(--charcoal)",
            lineHeight: 1.15,
          }}
        >
          {d.greeting}
        </h1>
      </div>

      <div style={{ padding: "30px 30px 0" }}>
        <Hairline />
        <StatRow
          name="Steps"
          value={d.steps.value.toLocaleString()}
          unit={`/ ${d.steps.goal.toLocaleString()}`}
          pct={stepPct}
        />
        <StatRow name="Calories" value={String(d.calories)} unit="kcal" />
        <StatRow name="Water" value={String(d.water_litres)} unit="L" />
      </div>

      <div style={{ padding: "26px 30px 0" }}>
        <Label>Today</Label>
        <div style={{ padding: "12px 0 0" }}>
          {d.today_sessions.length === 0 && (
            <div style={{ padding: "12px 0", fontSize: 12, color: "var(--muted)" }}>
              Nothing scheduled today.
            </div>
          )}
          {d.today_sessions.map((s, i) => (
            <WorkoutRow key={i} {...s} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: "auto" }}>
        <TabBar />
      </div>
    </div>
  );
}
