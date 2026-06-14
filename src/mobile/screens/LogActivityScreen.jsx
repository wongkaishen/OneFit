"use client";
import React, { useState } from "react";
import { ScreenHeader, Label, Hairline, Field, PrimaryButton } from "../Primitives";
import { logActivity } from "../../api/gymUser";
import TabBar from "../TabBar";

function BigStat({ value, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <span
        style={{
          fontFamily: "var(--font-numeral)",
          fontWeight: 700,
          fontSize: 28,
          color: "var(--charcoal)",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <div style={{ marginTop: 8 }}>
        <Label>{label}</Label>
      </div>
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

export default function LogActivityScreen({ onBack, onSave }) {
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ paddingTop: 12 }}>
        <ScreenHeader title="Log activity" onBack={onBack} />
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ padding: "28px 30px 0" }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-greeting)",
              fontWeight: 400,
              fontSize: 22,
              letterSpacing: "-0.5px",
              color: "var(--charcoal)",
              lineHeight: 1.15,
            }}
          >
            {dateLabel}
          </h2>
          <div style={{ marginTop: 10 }}>
            <Label>{weekLabel}</Label>
          </div>
        </div>

        <div style={{ padding: "26px 30px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <BigStat value="7,342" label="Steps" />
            <BigStat value="420" label="Kcal" />
            <BigStat value="4.8" label="Km" />
          </div>
          <div style={{ marginTop: 26 }}>
            <Hairline />
          </div>
        </div>

        <div style={{ padding: "24px 30px 0" }}>
          <Label>Activity</Label>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            {activities.map((a) => (
              <Chip key={a} active={a === activity} onClick={() => setActivity(a)}>
                {a}
              </Chip>
            ))}
          </div>
        </div>

        <div style={{ padding: "26px 30px 0", display: "flex", flexDirection: "column", gap: 22 }}>
          <Field
            label="DURATION (MIN)"
            value={duration}
            onChange={setDuration}
            numeric
          />
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
      </div>

      {err && (
        <div style={{ padding: "0 30px 12px", color: "var(--coral)", fontSize: 12 }}>
          {err}
        </div>
      )}

      <div style={{ padding: "0 30px 16px" }}>
        <PrimaryButton onClick={busy ? undefined : submit}>
          {busy ? "Saving…" : "Save entry"}
        </PrimaryButton>
      </div>
      <TabBar />
    </div>
  );
}
