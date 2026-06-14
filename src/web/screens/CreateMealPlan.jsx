import React, { useState } from "react";
import WebShell from "../WebShell";
import { WLabel, WButton, WChip, WHairline, WProgress } from "../WebPrimitives";
import { WELLNESS_NAV } from "./ClientList";

const MEALS = [
  {
    name: "Breakfast",
    kcal: 350,
    items: [{ name: "Oatmeal · Banana · Almond milk", kcal: 350 }],
  },
  {
    name: "Lunch",
    kcal: 620,
    items: [
      { name: "Grilled chicken · Brown rice", kcal: 480 },
      { name: "Garden salad", kcal: 140 },
    ],
  },
  {
    name: "Dinner",
    kcal: 500,
    items: [{ name: "Salmon · Quinoa · Greens", kcal: 500 }],
  },
  {
    name: "Snacks",
    kcal: 380,
    items: [
      { name: "Greek yogurt · Berries", kcal: 220 },
      { name: "Almonds", kcal: 160 },
    ],
  },
];

function MealDropTarget({ meal }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 14, color: "var(--charcoal)" }}>
          {meal.name}
        </span>
        <WLabel>{meal.kcal} kcal</WLabel>
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

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CreateMealPlan({ onBack, onNav }) {
  const [day, setDay] = useState("Mon");

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
              defaultValue="Lean & Steady · Week 23"
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
        <div style={{ display: "flex", gap: 10 }}>
          <WButton variant="ghost" size="sm">
            Save draft
          </WButton>
          <WButton variant="primary" size="sm">
            Publish plan
          </WButton>
        </div>
      </div>

      <div style={{ padding: "20px 36px 0", display: "flex", gap: 8 }}>
        {DAYS.map((d) => (
          <WChip key={d} active={d === day} onClick={() => setDay(d)}>
            {d}
          </WChip>
        ))}
      </div>

      <div style={{ padding: "26px 36px", display: "grid", gridTemplateColumns: "1fr 320px" }}>
        <div style={{ paddingRight: 40 }}>
          {MEALS.map((m) => (
            <MealDropTarget key={m.name} meal={m} />
          ))}
        </div>
        <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 32 }}>
          <WLabel>Live summary · {day}</WLabel>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "14px 0 6px" }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 38, color: "var(--charcoal)" }}>
              1,850
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>/ 1,850 kcal</span>
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
            <span style={{ fontSize: 13, color: "var(--charcoal)" }}>4</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <WLabel>Water target</WLabel>
            <span style={{ fontSize: 13, color: "var(--charcoal)" }}>2.4 L</span>
          </div>
        </div>
      </div>
    </WebShell>
  );
}
