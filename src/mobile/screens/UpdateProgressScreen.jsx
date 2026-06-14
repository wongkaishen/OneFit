"use client";
import React, { useEffect, useState } from "react";
import { ScreenHeader, Label, Field, Hairline, PrimaryButton } from "../Primitives";
import { getProgress, logProgress, getMilestones } from "../../api/gymUser";

function BarChart({ data, height = 110 }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${(d.v / max) * 100}%`,
                background: isLast ? "var(--coral)" : "var(--border)",
              }}
            />
            <Label>{d.label}</Label>
          </div>
        );
      })}
    </div>
  );
}

export default function UpdateProgressScreen({ onBack }) {
  const [entries, setEntries] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const refresh = async () => {
    try {
      setEntries(await getProgress());
    } catch {}
    try {
      setMilestones(await getMilestones());
    } catch {}
  };
  useEffect(() => {
    refresh();
  }, []);

  const save = async () => {
    setMsg("");
    setBusy(true);
    try {
      await logProgress({
        weight: Number(weight),
        body_fat_percent: bodyFat ? Number(bodyFat) : undefined,
        recorded_at: new Date().toISOString(),
      });
      setWeight("");
      setBodyFat("");
      await refresh();
      setMsg("Saved.");
    } catch (e) {
      setMsg(e.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...entries].sort(
    (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)
  );
  const latest = sorted[sorted.length - 1];
  const earliest = sorted[0];
  const delta =
    latest && earliest ? (earliest.weight - latest.weight).toFixed(1) : "0.0";
  const chartData = sorted.slice(-6).map((e, i) => ({
    v: e.weight,
    label: `W${17 + i}`,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ paddingTop: 12 }}>
        <ScreenHeader title="Your progress" onBack={onBack} />
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ padding: "28px 30px 0" }}>
          <Label>Current weight</Label>
          <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-numeral)",
                fontWeight: 700,
                fontSize: 36,
                color: "var(--charcoal)",
              }}
            >
              {latest?.weight ?? "—"}
            </span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--muted)" }}>
              kg
            </span>
          </div>
          {Number(delta) > 0 && (
            <div style={{ marginTop: 8 }}>
              <Label color="var(--coral)" style={{ letterSpacing: "1px" }}>
                ↓ {delta} KG THIS MONTH
              </Label>
            </div>
          )}
        </div>

        <div style={{ padding: "26px 30px 0" }}>
          <BarChart data={chartData} />
        </div>

        <div style={{ padding: "26px 30px 0" }}>
          <Label>Log new measurements</Label>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 22 }}>
            <Field label="WEIGHT (KG)" value={weight} onChange={setWeight} />
            <Field label="BODY FAT %" value={bodyFat} onChange={setBodyFat} />
          </div>
        </div>

        <div style={{ padding: "26px 30px 0" }}>
          <Label>Recent milestones</Label>
          <div style={{ marginTop: 12 }}>
            <Hairline />
            {milestones.length === 0 && (
              <div style={{ padding: "16px 0", fontSize: 12, color: "var(--muted)" }}>
                Log your first measurement to start earning badges.
              </div>
            )}
            {milestones.map((m) => (
              <div
                key={m.milestone_id}
                style={{
                  padding: "14px 0",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--charcoal)" }}>{m.badge}</span>
                <Label>{new Date(m.achieved_at).toLocaleDateString()}</Label>
              </div>
            ))}
          </div>
        </div>

        {msg && (
          <div
            style={{
              padding: "16px 30px 0",
              color: msg === "Saved." ? "var(--muted)" : "var(--coral)",
              fontSize: 12,
            }}
          >
            {msg}
          </div>
        )}
      </div>

      <div style={{ padding: "20px 30px 30px" }}>
        <PrimaryButton onClick={busy || !weight ? undefined : save}>
          {busy ? "Saving…" : "Save progress"}
        </PrimaryButton>
      </div>
    </div>
  );
}
