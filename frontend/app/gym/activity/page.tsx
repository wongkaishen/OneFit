"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { PageIntro } from "@/components/ui/PageIntro";
import { ApiError } from "@/lib/api/client";
import { logActivity } from "@/lib/api/gym";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function GymActivityPage() {
  const [workoutType, setWorkoutType] = useState("");
  const [duration, setDuration] = useState("");
  const [steps, setSteps] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [calories, setCalories] = useState("");
  const [logDate, setLogDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(null);
    setBusy(true);
    try {
      await logActivity({
        workout_type: workoutType.trim() || null,
        duration: num(duration),
        steps: num(steps),
        heart_rate: num(heartRate),
        calories_burned: num(calories),
        log_date: logDate,
      });
      setSaved("Activity logged.");
      setWorkoutType(""); setDuration(""); setSteps(""); setHeartRate(""); setCalories("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to log activity");
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
      <TopBar title="Log activity" search="Search" avatarLetter="G" />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[560px] px-9 py-[30px]">
          <PageIntro>
            Log your workouts, steps, and heart rate. Calories burned here offset your daily balance
            on the dashboard.
          </PageIntro>
          <Label>Daily activity</Label>
          <form onSubmit={submit} className="mt-5 flex flex-col gap-5">
            {field("Workout type", workoutType, setWorkoutType, "text", "e.g. Running")}
            <div className="grid grid-cols-2 gap-5">
              {field("Duration (min)", duration, setDuration)}
              {field("Steps", steps, setSteps)}
              {field("Heart rate (bpm)", heartRate, setHeartRate)}
              {field("Calories burned", calories, setCalories)}
            </div>
            {field("Date", logDate, setLogDate, "date")}

            {error && <div className="text-[13px] text-coral">{error}</div>}
            {saved && <div className="text-[13px] text-good">{saved}</div>}

            <div>
              <Button type="submit" variant="dark" disabled={busy}>
                {busy ? "Logging…" : "Log activity"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
