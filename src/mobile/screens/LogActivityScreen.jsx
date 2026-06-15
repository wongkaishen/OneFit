"use client";
import React, { useState } from "react";
import GymShell from "../../web/GymShell";
import { WLabel } from "../../web/WebPrimitives";
import { Label, Hairline, Field, PrimaryButton } from "../Primitives";
import { logActivity } from "../../api/gymUser";

function Kpi({ label, value }) {
  return (
    <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
      <WLabel>{label}</WLabel>
      <span
        style={{
          fontFamily: "var(--font-numeral)",
          fontWeight: 700,
          fontSize: 32,
          color: "var(--charcoal)",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Chip({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        height: 40,
        border: active ? "1px solid var(--charcoal)" : "1px solid var(--border)",
        background: active ? "var(--charcoal)" : "var(--white)",
        color: active ? "var(--cream)" : "var(--charcoal)",
        fontFamily: "var(--font-sans)",
        fontWeight: active ? 600 : 400,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

const today = new Date();
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function getWeekOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = (d - start) / 86400000;
  return Math.ceil((diff + start.getDay() + 1) / 7);
}

export default function LogActivityScreen({ onSave }) {
  const [activity, setActivity] = useState("Run");
  const [duration, setDuration] = useState("35");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const activities = ["Run", "Cycle", "Swim", "Gym"];

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      await logActivity({
        workout_type: activity,
        duration: Number(duration) || 0,
        source: "manual",
        log_date: new Date().toISOString().slice(0, 10),
      });
      onSave?.();
    } catch (e) {
      setErr(e.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const dateLabel = `${WEEKDAYS[today.getDay()]}, ${today.getDate()} ${MONTHS[today.getMonth()]}`;
  const weekLabel = `WEEK ${getWeekOfYear(today)} · ${today.getFullYear()}`;

  return (
    <GymShell active="Train" title="Log activity" search="Search activities">
      <div style={{ padding: "30px 36px", maxWidth: 1100 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-greeting)",
            fontWeight: 400,
            fontSize: 30,
            letterSpacing: "-0.5px",
            color: "var(--charcoal)",
            lineHeight: 1.1,
          }}
        >
          {dateLabel}
        </h2>
        <div style={{ marginTop: 10 }}>
          <Label>{weekLabel}</Label>
        </div>

        <div className="og-kpi" style={{ marginTop: 24 }}>
          <Kpi label="Steps" value="7,342" />
          <Kpi label="Kcal" value="420" />
          <Kpi label="Km" value="4.8" />
        </div>

        <div style={{ maxWidth: 640, marginTop: 36 }}>
          <Label>Activity</Label>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            {activities.map((a) => (
              <Chip key={a} active={a === activity} onClick={() => setActivity(a)}>
                {a}
              </Chip>
            ))}
          </div>

          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 22 }}>
            <Field label="DURATION (MIN)" value={duration} onChange={setDuration} numeric />
            <div>
              <Label>How did it feel?</Label>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                  marginBottom: 14,
                }}
              >
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--charcoal)" }}>
                  Moderate intensity
                </span>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--charcoal)" }}>
                  ▾
                </span>
              </div>
              <Hairline />
            </div>
            <div>
              <Label>Notes</Label>
              <div
                style={{
                  marginTop: 12,
                  marginBottom: 14,
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "var(--muted)",
                }}
              >
                Morning loop at the lake…
              </div>
              <Hairline />
            </div>
          </div>

          {err && (
            <div style={{ marginTop: 16, color: "var(--coral)", fontSize: 12 }}>{err}</div>
          )}

          <div style={{ marginTop: 28, maxWidth: 280 }}>
            <PrimaryButton onClick={busy ? undefined : submit}>
              {busy ? "Saving…" : "Save entry"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </GymShell>
  );
}
