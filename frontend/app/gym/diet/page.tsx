"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { PageIntro } from "@/components/ui/PageIntro";
import { ApiError } from "@/lib/api/client";
import { logDiet, listMealPlans } from "@/lib/api/gym";
import { searchNutrition } from "@/lib/api/ai";
import { useResource } from "@/lib/api/useResource";
import { MealPlanCard } from "@/components/MealPlanCard";
import type { MealPlanOut } from "@/lib/api/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"];

export default function GymDietPage() {
  const mealPlans = useResource<MealPlanOut[]>(listMealPlans, []);
  const [mealTime, setMealTime] = useState(MEALS[0]);
  const [foodItem, setFoodItem] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [logDate, setLogDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [foodQuery, setFoodQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  const lookup = async () => {
    if (!foodQuery.trim()) return;
    setSearchMsg(null); setSearching(true);
    try {
      const n = await searchNutrition(foodQuery.trim());
      // pre-fill the existing diet form fields:
      setFoodItem(n.food); setCalories(String(n.calories));
      setProtein(String(n.protein_g)); setCarbs(String(n.carbs_g)); setFat(String(n.fat_g));
    } catch (e) {
      setSearchMsg(e instanceof ApiError && e.status === 501 ? "AI coming soon — add an OpenAI key." : "Lookup failed.");
    } finally { setSearching(false); }
  };

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(null);
    if (calories.trim() === "") {
      setError("Calories are required.");
      return;
    }
    setBusy(true);
    try {
      await logDiet({
        meal_time: mealTime,
        food_item: foodItem.trim() || null,
        calories: Number(calories),
        protein: num(protein),
        carbs: num(carbs),
        fat: num(fat),
        log_date: logDate,
      });
      setSaved("Meal logged.");
      setFoodItem(""); setCalories(""); setProtein(""); setCarbs(""); setFat("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to log meal");
    } finally {
      setBusy(false);
    }
  };

  const field = (
    label: string, value: string, set: (v: string) => void, type = "number", placeholder = "",
  ) => (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value)}
        className="h-[42px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
      />
    </div>
  );

  return (
    <>
      <TopBar title="Log diet" search="Search" avatarLetter="G" />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[560px] px-9 py-[30px]">
          <PageIntro>
            Log what you eat and follow your assigned meal plan. Calories you log are subtracted from
            your daily balance on the dashboard.
          </PageIntro>
          <Label>Your meal plan</Label>
          <div className="mt-3">
            {mealPlans.loading && <Label>Loading…</Label>}
            {mealPlans.error && <div className="text-[13px] text-coral">{mealPlans.error}</div>}
            {!mealPlans.loading && (mealPlans.data ?? []).length === 0 && (
              <div className="mb-5 border border-border bg-white p-5">
                <Label>No meal plan from your specialist yet.</Label>
              </div>
            )}
            {(mealPlans.data ?? []).map((p) => (
              <MealPlanCard key={p.plan_id} plan={p} />
            ))}
          </div>

          <Label>Dietary intake</Label>
          <div className="mb-6 flex items-end gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <Label>Search a food (AI)</Label>
              <input value={foodQuery} onChange={(e) => setFoodQuery(e.target.value)} placeholder="e.g. 1 banana"
                className="h-[42px] border border-border bg-white px-3 text-[14px] outline-none focus:border-charcoal" />
            </div>
            <Button type="button" variant="ghost" disabled={searching} onClick={lookup}>{searching ? "Searching…" : "Look up"}</Button>
          </div>
          {searchMsg && <div className="mb-2 text-[13px] text-coral">{searchMsg}</div>}
          <form onSubmit={submit} className="mt-5 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Meal</Label>
              <select
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value)}
                className="h-[42px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
              >
                {MEALS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {field("Food item", foodItem, setFoodItem, "text", "e.g. Chicken salad")}
            <div className="grid grid-cols-2 gap-5">
              {field("Calories", calories, setCalories)}
              {field("Protein (g)", protein, setProtein)}
              {field("Carbs (g)", carbs, setCarbs)}
              {field("Fat (g)", fat, setFat)}
            </div>
            {field("Date", logDate, setLogDate, "date")}

            {error && <div className="text-[13px] text-coral">{error}</div>}
            {saved && <div className="text-[13px] text-good">{saved}</div>}

            <div>
              <Button type="submit" variant="dark" disabled={busy}>
                {busy ? "Logging…" : "Log meal"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
