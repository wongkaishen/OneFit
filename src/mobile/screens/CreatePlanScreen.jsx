"use client";
import React, { useState } from "react";
import { ScreenHeader, Label, Hairline, PrimaryButton } from "../Primitives";
import { createPlan } from "../../api/gymUser";
import { generateWorkoutPlan } from "../../api/ai";

const GOALS = ["Lose fat", "Build muscle", "Endurance", "Maintain"];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function CreatePlanScreen({ onBack, onSaved }) {
  const [goal, setGoal] = useState("Lose fat");
  const [days, setDays] = useState([true, false, true, false, true, false, false]);
  const [busy, setBusy] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);
  const [err, setErr] = useState("");

  const toggleDay = (i) => {
    setDays((d) => d.map((v, idx) => (idx === i ? !v : v)));
  };

  const generate = async () => {
    setErr("");
    setBusy(true);
    setComingSoon(false);
    try {
      await generateWorkoutPlan({ goal, days_per_week: days.filter(Boolean).length });
      onSaved?.();
    } catch (e) {
      if (e.status === 501) {
        setComingSoon(true);
      } else {
        setErr(e.detail || "Failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const saveManual = async () => {
    setErr("");
    setBusy(true);
    try {
      await createPlan({ goal, generated_by: "manual" });
      onSaved?.();
    } catch (e) {
      setErr(e.detail || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ paddingTop: 12 }}>
        <ScreenHeader title="New plan" onBack={onBack} />
      </div>

      <div style={{ padding: "26px 30px 0" }}>
        <Label>Goal</Label>
        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
          {GOALS.map((g) => {
            const active = g === goal;
            return (
              <button
                key={g}
                onClick={() => setGoal(g)}
                style={{
                  height: 36,
                  padding: "0 16px",
                  background: active ? "var(--charcoal)" : "var(--white)",
                  color: active ? "var(--cream)" : "var(--charcoal)",
                  border: active ? "1px solid var(--charcoal)" : "1px solid var(--border)",
                  fontFamily: "var(--font-sans)",
                  fontWeight: active ? 600 : 400,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "26px 30px 0" }}>
        <Label>Training days</Label>
        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
          {DAYS.map((d, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: days[i] ? "var(--coral)" : "transparent",
                color: days[i] ? "var(--charcoal)" : "var(--muted)",
                border: days[i] ? "1px solid var(--coral)" : "1px solid var(--border)",
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "26px 30px 0" }}>
        <Label>AI-curated for you</Label>
        <div style={{ marginTop: 12 }}>
          <Hairline />
          {[
            { name: "Warm-up", dur: "8 min" },
            { name: "Push-ups · 3 × 12", dur: "10 min" },
            { name: "Squats · 3 × 15", dur: "12 min" },
            { name: "Plank intervals", dur: "6 min" },
            { name: "Cool-down stretch", dur: "5 min" },
          ].map((ex) => (
            <div
              key={ex.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "16px 0",
                borderBottom: "1px solid var(--border)",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                color: "var(--charcoal)",
              }}
            >
              <span>{ex.name}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{ex.dur}</span>
            </div>
          ))}
        </div>
      </div>

      {comingSoon && (
        <div style={{ padding: "20px 30px 0", color: "var(--muted)", fontSize: 12 }}>
          AI plan generation coming soon. You can save this plan manually for now.
        </div>
      )}
      {err && (
        <div style={{ padding: "20px 30px 0", color: "var(--coral)", fontSize: 12 }}>
          {err}
        </div>
      )}

      <div
        style={{
          marginTop: "auto",
          padding: "20px 30px 30px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <PrimaryButton onClick={busy ? undefined : comingSoon ? saveManual : generate}>
          {busy ? "Working…" : comingSoon ? "Save plan" : "Generate plan ✨"}
        </PrimaryButton>
      </div>
    </div>
  );
}
