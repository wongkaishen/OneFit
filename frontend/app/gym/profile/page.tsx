"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { PageIntro } from "@/components/ui/PageIntro";
import { ApiError } from "@/lib/api/client";
import { getProfile, updateProfile } from "@/lib/api/gym";
import type { FitnessProfile } from "@/lib/api/types";

type FormState = {
  age: string;
  height: string;
  weight: string;
  body_fat_percent: string;
  fitness_goal: string;
};

const EMPTY: FormState = { age: "", height: "", weight: "", body_fat_percent: "", fitness_goal: "" };

function toForm(p: FitnessProfile | null): FormState {
  if (!p) return EMPTY;
  return {
    age: p.age?.toString() ?? "",
    height: p.height?.toString() ?? "",
    weight: p.weight?.toString() ?? "",
    body_fat_percent: p.body_fat_percent?.toString() ?? "",
    fitness_goal: p.fitness_goal ?? "",
  };
}

const num = (v: string) => (v.trim() === "" ? null : Number(v));

export default function GymProfilePage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getProfile()
      .then((p) => alive && setForm(toForm(p)))
      .catch((e: unknown) => {
        // 404 = no profile row yet; start blank rather than error.
        if (e instanceof ApiError && e.status === 404) return;
        if (alive) setError(e instanceof ApiError ? e.message : "Failed to load profile");
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const updated = await updateProfile({
        age: num(form.age),
        height: num(form.height),
        weight: num(form.weight),
        body_fat_percent: num(form.body_fat_percent),
        fitness_goal: form.fitness_goal.trim() || null,
      });
      setForm(toForm(updated));
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, key: keyof FormState, type = "number", suffix?: string) => (
    <div className="flex flex-col gap-2">
      <Label>{label}{suffix ? ` (${suffix})` : ""}</Label>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        className="h-[42px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
      />
    </div>
  );

  return (
    <>
      <TopBar title="Profile" search="Search" avatarLetter="G" />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[560px] px-9 py-[30px]">
          <PageIntro>
            Keep your age, height, weight, and goal current so your dashboard, plans, and progress
            stay accurate.
          </PageIntro>
          <Label>Fitness profile</Label>
          {loading ? (
            <div className="mt-6"><Label>Loading…</Label></div>
          ) : (
            <form onSubmit={save} className="mt-5 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-5">
                {field("Age", "age")}
                {field("Height", "height", "number", "cm")}
                {field("Weight", "weight", "number", "kg")}
                {field("Body fat", "body_fat_percent", "number", "%")}
              </div>
              {field("Fitness goal", "fitness_goal", "text")}

              {error && <div className="text-[13px] text-coral">{error}</div>}
              {saved && <div className="text-[13px] text-good">Profile saved.</div>}

              <div>
                <Button type="submit" variant="dark" disabled={busy}>
                  {busy ? "Saving…" : "Save profile"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
