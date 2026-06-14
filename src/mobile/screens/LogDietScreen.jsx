import React from "react";
import { ScreenHeader, Label, Hairline, PrimaryButton } from "../Primitives";

function MacroBar({ label, value, pct }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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
      <div style={{ marginTop: 7 }}>
        <Label>{label}</Label>
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          color: "var(--charcoal)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MealRow({ name, time, kcal, items }) {
  return (
    <div style={{ padding: "20px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 16,
            color: "var(--charcoal)",
          }}
        >
          {name}
        </span>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--charcoal)" }}>
          {kcal}
        </span>
      </div>
      <div style={{ marginTop: 6 }}>
        <Label>{time}</Label>
      </div>
      <div
        style={{
          marginTop: 12,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        {items}
      </div>
    </div>
  );
}

export default function LogDietScreen({ onBack, onAdd }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ paddingTop: 12 }}>
        <ScreenHeader title="What you ate" onBack={onBack} />
      </div>

      <div style={{ flex: 1, padding: "26px 30px 0", overflow: "auto" }}>
        <Label>Today's intake</Label>
        <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 6 }}>
          <span
            style={{
              fontFamily: "var(--font-numeral)",
              fontWeight: 700,
              fontSize: 28,
              color: "var(--charcoal)",
              lineHeight: 1,
            }}
          >
            1,840
          </span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--muted)" }}>
            / 1,850 kcal
          </span>
        </div>

        <div style={{ marginTop: 22, display: "flex", gap: 20 }}>
          <MacroBar label="Protein" value="145g" pct={0.88} />
          <MacroBar label="Carbs" value="210g" pct={0.75} />
          <MacroBar label="Fat" value="55g" pct={0.62} />
        </div>

        <div style={{ marginTop: 22 }}>
          <Hairline />
          <MealRow
            name="Breakfast"
            time="08:15"
            kcal="350 kcal"
            items="Oatmeal · Banana · Almond milk"
          />
          <Hairline />
          <MealRow
            name="Lunch"
            time="12:40"
            kcal="620 kcal"
            items="Grilled chicken · Brown rice · Salad"
          />
          <Hairline />
          <MealRow
            name="Snack"
            time="16:00"
            kcal="220 kcal"
            items="Greek yogurt · Honey · Berries"
          />
          <Hairline />
        </div>
      </div>

      <div style={{ padding: "20px 30px 30px" }}>
        <PrimaryButton variant="outline" onClick={onAdd}>
          + Add meal
        </PrimaryButton>
      </div>
    </div>
  );
}
