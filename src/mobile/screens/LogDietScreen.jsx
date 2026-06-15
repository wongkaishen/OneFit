"use client";
import React, { useState } from "react";
import GymShell from "../../web/GymShell";
import { Label, Field, Hairline, PrimaryButton } from "../Primitives";
import { logDiet } from "../../api/gymUser";
import CalorieRing from "../components/CalorieRing";

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
      <div style={{ marginTop: 6, fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--charcoal)" }}>
        {value}
      </div>
    </div>
  );
}

function MealRow({ name, time, kcal, items }) {
  return (
    <div style={{ padding: "20px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 16, color: "var(--charcoal)" }}>
          {name}
        </span>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--charcoal)" }}>
          {kcal}
        </span>
      </div>
      <div style={{ marginTop: 6 }}>
        <Label>{time}</Label>
      </div>
      <div style={{ marginTop: 12, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--muted)" }}>
        {items}
      </div>
    </div>
  );
}

const MEAL_TIMES = ["breakfast", "lunch", "dinner", "snack"];

export default function LogDietScreen() {
  const [form, setForm] = useState({ meal_time: "snack", food_item: "", calories: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submitMeal = async () => {
    setMsg("");
    setBusy(true);
    try {
      await logDiet({
        meal_time: form.meal_time,
        food_item: form.food_item,
        calories: Number(form.calories) || 0,
        entry_mode: "quick",
        log_date: new Date().toISOString().slice(0, 10),
      });
      setForm({ meal_time: "snack", food_item: "", calories: "" });
      setMsg("Meal added.");
    } catch (e) {
      setMsg(e.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GymShell active="Eat" title="What you ate" search="Search foods">
      <div style={{ padding: "30px 36px", maxWidth: 1100 }}>
        <div className="og-cols">
          {/* Left: intake + macros + meals */}
          <div>
            <Label>Today's intake</Label>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
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
                  1,840
                </span>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--muted)" }}>
                  / 1,850 kcal
                </span>
              </div>
              <CalorieRing value={1840} goal={1850} />
            </div>

            <div style={{ marginTop: 22, display: "flex", gap: 20 }}>
              <MacroBar label="Protein" value="145g" pct={0.88} />
              <MacroBar label="Carbs" value="210g" pct={0.75} />
              <MacroBar label="Fat" value="55g" pct={0.62} />
            </div>

            <div style={{ marginTop: 22 }}>
              <Hairline />
              <MealRow name="Breakfast" time="08:15" kcal="350 kcal" items="Oatmeal · Banana · Almond milk" />
              <Hairline />
              <MealRow name="Lunch" time="12:40" kcal="620 kcal" items="Grilled chicken · Brown rice · Salad" />
              <Hairline />
              <MealRow name="Snack" time="16:00" kcal="220 kcal" items="Greek yogurt · Honey · Berries" />
              <Hairline />
            </div>
          </div>

          {/* Right: add meal */}
          <div>
            <Label>Add a meal</Label>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              <Field
                label="FOOD"
                value={form.food_item}
                onChange={(v) => setForm({ ...form, food_item: v })}
                placeholder="e.g. Apple"
              />
              <Field
                label="CALORIES"
                value={form.calories}
                onChange={(v) => setForm({ ...form, calories: v })}
                numeric
              />
              <div style={{ display: "flex", gap: 8 }}>
                {MEAL_TIMES.map((m) => (
                  <button
                    key={m}
                    onClick={() => setForm({ ...form, meal_time: m })}
                    style={{
                      flex: 1,
                      height: 36,
                      background: form.meal_time === m ? "var(--charcoal)" : "transparent",
                      color: form.meal_time === m ? "var(--cream)" : "var(--charcoal)",
                      border:
                        form.meal_time === m
                          ? "1px solid var(--charcoal)"
                          : "1px solid var(--border)",
                      fontFamily: "var(--font-sans)",
                      fontWeight: form.meal_time === m ? 600 : 400,
                      fontSize: 11,
                      textTransform: "capitalize",
                      cursor: "pointer",
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {msg && (
                <div
                  style={{
                    color: msg === "Meal added." ? "var(--muted)" : "var(--coral)",
                    fontSize: 12,
                  }}
                >
                  {msg}
                </div>
              )}
              <PrimaryButton onClick={busy || !form.food_item ? undefined : submitMeal}>
                {busy ? "Saving…" : "Save meal"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </GymShell>
  );
}
