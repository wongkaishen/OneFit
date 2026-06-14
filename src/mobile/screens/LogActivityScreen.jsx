import React, { useState } from "react";
import { ScreenHeader, Label, Hairline, Field, PrimaryButton } from "../Primitives";

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

export default function LogActivityScreen({ onBack, onSave }) {
  const [activity, setActivity] = useState("Run");
  const activities = ["Run", "Cycle", "Swim", "Gym"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ paddingTop: 12 }}>
        <ScreenHeader title="Log activity" onBack={onBack} />
      </div>

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
          Sunday, 31 May
        </h2>
        <div style={{ marginTop: 10 }}>
          <Label>WEEK 22 · 2026</Label>
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
        <Field label="DURATION" value="35 minutes" />
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

      <div style={{ marginTop: "auto", padding: "0 30px 30px" }}>
        <PrimaryButton onClick={onSave}>Save entry</PrimaryButton>
      </div>
    </div>
  );
}
