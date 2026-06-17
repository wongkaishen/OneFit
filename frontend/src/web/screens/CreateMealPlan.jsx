import React, { useState } from "react";
import WebShell from "../WebShell";
import { WLabel, WButton, WChip, WHairline, WProgress } from "../WebPrimitives";
import { WELLNESS_NAV } from "./ClientList";
import { createMealPlan } from "../../api/specialist";

const DEFAULT_MEALS = [
  {
    name: "Breakfast",
    items: [{ name: "Oatmeal · Banana · Almond milk", kcal: 350 }],
  },
  {
    name: "Lunch",
    items: [
      { name: "Grilled chicken · Brown rice", kcal: 480 },
      { name: "Garden salad", kcal: 140 },
    ],
  },
  {
    name: "Dinner",
    items: [{ name: "Salmon · Quinoa · Greens", kcal: 500 }],
  },
  {
    name: "Snacks",
    items: [
      { name: "Greek yogurt · Berries", kcal: 220 },
      { name: "Almonds", kcal: 160 },
    ],
  },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function MealDropTarget({ meal, totalKcal }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 14, color: "var(--charcoal)" }}>
          {meal.name}
        </span>
        <WLabel>{totalKcal} kcal</WLabel>
      </div>
      {meal.items.map((it, i) => (
        <React.Fragment key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0" }}>
            <span style={{ fontSize: 13, color: "var(--charcoal)" }}>{it.name}</span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{it.kcal}</span>
          </div>
          <WHairline />
        </React.Fragment>
      ))}
      <div
        style={{
          marginTop: 12,
          height: 48,
          border: "1px dashed var(--muted)",
          background: "rgba(255,255,255,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            border: "1px solid var(--subtle)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "var(--subtle)",
          }}
        >
          +
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            fontSize: 11,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "var(--subtle)",
          }}
        >
          Add food
        </span>
      </div>
    </div>
  );
}

function MacroSummaryLine({ label, value, pct }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <WLabel>{label}</WLabel>
        <span style={{ fontWeight: 600, fontSize: 12, color: "var(--charcoal)" }}>{value}</span>
      </div>
      <WProgress pct={pct} width="100%" />
    </div>
  );
}

export default function CreateMealPlan({ onBack, onNav }) {
  const [day, setDay] = useState("Mon");
  const [name, setName] = useState("Lean & Steady · Week 23");
  const [goal, setGoal] = useState("maintain");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ kind: "idle", message: "" });

  const totalKcal = DEFAULT_MEALS.reduce(
    (sum, m) => sum + m.items.reduce((s, it) => s + it.kcal, 0),
    0,
  );

  const publish = async () => {
    if (!name.trim()) {
      setStatus({ kind: "err", message: "Add a name before publishing." });
      return;
    }
    setBusy(true);
    setStatus({ kind: "idle", message: "" });
    try {
      // Persist the same template for every day for now; future work: per-day editing.
      const payload = DAYS.map((d) => ({
        day: d,
        meals: DEFAULT_MEALS.flatMap((m) =>
          m.items.map((it) => ({
            slot: m.name.toLowerCase(),
            food_item: it.name,
            calories: it.kcal,
          })),
        ),
      }));
      await createMealPlan({
        name: name.trim(),
        goal,
        days_per_week: 7,
        payload,
      });
      setStatus({ kind: "ok", message: "Meal plan saved." });
    } catch (e) {
      setStatus({ kind: "err", message: e?.detail || "Failed to save meal plan." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <WebShell
      nav={WELLNESS_NAV}
      active="Plans"
      role="Wellness Specialist"
      title="Plans"
      search="Search foods"
      onNav={onNav}
    >
      <div style={{ padding: "22px 36px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span onClick={onBack} style={{ fontSize: 20, color: "var(--charcoal)", cursor: "pointer" }}>
            ‹
          </span>
          <div>
            <WLabel>New meal plan · draft</WLabel>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                display: "block",
                marginTop: 6,
                border: "none",
                background: "transparent",
                outline: "none",
                fontFamily: "var(--font-serif)",
                fontSize: 24,
                color: "var(--charcoal)",
                width: 420,
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            style={{
              border: "1px solid var(--border)",
              background: "transparent",
              padding: "8px 10px",
              fontSize: 12,
              color: "var(--charcoal)",
              outline: "none",
            }}
          >
            <option value="maintain">Maintain</option>
            <option value="lose-fat">Lose fat</option>
            <option value="build-muscle">Build muscle</option>
            <option value="endurance">Endurance</option>
          </select>
          <WButton variant="primary" size="sm" onClick={busy ? undefined : publish}>
            {busy ? "Saving…" : "Publish plan"}
          </WButton>
        </div>
      </div>

      {status.kind !== "idle" && (
        <div
          style={{
            padding: "10px 36px",
            fontSize: 12,
            color: status.kind === "ok" ? "var(--charcoal)" : "var(--coral)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {status.message}
        </div>
      )}

      <div style={{ padding: "20px 36px 0", display: "flex", gap: 8 }}>
        {DAYS.map((d) => (
          <WChip key={d} active={d === day} onClick={() => setDay(d)}>
            {d}
          </WChip>
        ))}
      </div>

      <div className="mp-cols" style={{ padding: "26px 36px" }}>
        <div style={{ paddingRight: 40 }}>
          {DEFAULT_MEALS.map((m) => (
            <MealDropTarget
              key={m.name}
              meal={m}
              totalKcal={m.items.reduce((s, it) => s + it.kcal, 0)}
            />
          ))}
        </div>
        <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 32 }}>
          <WLabel>Live summary · {day}</WLabel>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "14px 0 6px" }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 38, color: "var(--charcoal)" }}>
              {totalKcal.toLocaleString()}
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>kcal total</span>
          </div>
          <WProgress pct={100} width="100%" />
          <div style={{ marginTop: 24 }}>
            <MacroSummaryLine label="Protein" value="145g" pct={88} />
            <MacroSummaryLine label="Carbs" value="210g" pct={75} />
            <MacroSummaryLine label="Fat" value="55g" pct={62} />
          </div>
          <WHairline style={{ margin: "20px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <WLabel>Meals</WLabel>
            <span style={{ fontSize: 13, color: "var(--charcoal)" }}>{DEFAULT_MEALS.length}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <WLabel>Days per week</WLabel>
            <span style={{ fontSize: 13, color: "var(--charcoal)" }}>7</span>
          </div>
        </div>
      </div>
    </WebShell>
  );
}
