"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Card, CardHeader } from "@/components/ui/Card";
import { FormField, Input, Select } from "@/components/ui/Field";
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
      // Reject non-food inputs (e.g. "truck") so we don't log a 0-calorie meal.
      if (n.is_food === false || !n.food?.trim() || !(n.calories > 0)) {
        setSearchMsg(`“${foodQuery.trim()}” doesn’t look like a valid food item. Please enter a real food.`);
        return;
      }
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
    if (foodItem.trim() === "") {
      setError("Failed to log meal. Please enter a valid food item.");
      return;
    }
    if (calories.trim() === "" || !(Number(calories) > 0)) {
      setError("Failed to log meal. Enter the calories for this food (must be greater than 0).");
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
    <FormField label={label}>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
    </FormField>
  );

  return (
    <>
      <TopBar title="Log diet" search="Search" avatarLetter="G" />
      <PageBody max="form">
        <PageHeader eyebrow="Diet">
          Log what you eat and follow your assigned meal plan. Calories you log are subtracted from
          your daily balance on the dashboard.
        </PageHeader>
          <Label>Your meal plan</Label>
          <div className="mb-8 mt-3">
            {mealPlans.loading && <Label>Loading…</Label>}
            {mealPlans.error && <div className="text-[13px] text-coral">{mealPlans.error}</div>}
            {!mealPlans.loading && (mealPlans.data ?? []).length === 0 && (
              <Card className="text-[13px] text-muted">No meal plan from your specialist yet.</Card>
            )}
            {(mealPlans.data ?? []).map((p) => (
              <MealPlanCard key={p.plan_id} plan={p} />
            ))}
          </div>

          <Card>
          <CardHeader eyebrow="Dietary intake" title="Log a meal" />
          <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
            <FormField label="Search a food (AI)" className="flex-1">
              <Input value={foodQuery} onChange={(e) => setFoodQuery(e.target.value)} placeholder="e.g. 1 banana" />
            </FormField>
            <Button type="button" variant="ghost" disabled={searching} onClick={lookup}>{searching ? "Searching…" : "Look up"}</Button>
          </div>
          {searchMsg && <div className="mt-3 text-[13px] text-coral">{searchMsg}</div>}
          <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
            <FormField label="Meal">
              <Select value={mealTime} onChange={(e) => setMealTime(e.target.value)}>
                {MEALS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </FormField>
            {field("Food item", foodItem, setFoodItem, "text", "e.g. Chicken salad")}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
          </Card>
      </PageBody>
    </>
  );
}
