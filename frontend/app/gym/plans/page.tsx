"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { listPlans, createPlan, listMealPlans, updatePlan, discardPlan, acceptAiPlan } from "@/lib/api/gym";
import { generateWorkoutPlan } from "@/lib/api/ai";
import { shortDate } from "@/lib/format";
import { MealPlanCard } from "@/components/MealPlanCard";
import type { WorkoutPlan, MealPlanOut, AIPlan } from "@/lib/api/types";

export default function GymPlansPage() {
  const { data, error, loading, setData } = useResource<WorkoutPlan[]>(listPlans, []);
  const mealPlans = useResource<MealPlanOut[]>(listMealPlans, []);
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGoal, setEditGoal] = useState("");

  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);

  const generate = async () => {
    if (!goal.trim()) return;
    setAiMsg(null); setAiBusy(true);
    try { setAiPlan(await generateWorkoutPlan(goal.trim())); }
    catch (e) { setAiMsg(e instanceof ApiError && e.status === 501 ? "AI coming soon — add an OpenAI key." : "Generation failed."); }
    finally { setAiBusy(false); }
  };

  const acceptAi = async () => {
    if (!aiPlan) return;
    const flat = (aiPlan.days ?? []).flatMap((d) => d.exercises ?? []);
    try {
      const plan = await acceptAiPlan(aiPlan.goal, flat);
      setData((prev) => [plan, ...(prev ?? [])]);
      setAiPlan(null);
    } catch (e) {
      setAiMsg(e instanceof ApiError ? e.message : "Couldn't save the plan. Try again.");
    }
  };

  const saveEdit = async (id: string) => {
    if (!editGoal.trim()) return;
    try {
      const updated = await updatePlan(id, { goal: editGoal.trim() });
      setData((prev) => (prev ?? []).map((p) => (p.plan_id === id ? updated : p)));
      setEditingId(null);
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : "Failed to update plan");
    }
  };

  const discard = async (id: string) => {
    if (!confirm("Discard this plan? Its scheduled sessions will be removed.")) return;
    try {
      await discardPlan(id);
      setData((prev) => (prev ?? []).filter((p) => p.plan_id !== id));
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : "Failed to discard plan");
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;
    setFormErr(null);
    setBusy(true);
    try {
      const plan = await createPlan(goal.trim());
      setData((prev) => [plan, ...(prev ?? [])]);
      setGoal("");
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : "Failed to create plan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Workout plans" search="Search" avatarLetter="G" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <PageIntro>
            Create workout plans for your own goals and see the meal plan your specialist assigned.
            Once you have a plan, schedule its sessions on the calendar.
          </PageIntro>
          <Label>Meal plan from your specialist</Label>
          <div className="mt-3">
            {mealPlans.loading && <Label>Loading…</Label>}
            {mealPlans.error && <div className="text-[13px] text-coral">{mealPlans.error}</div>}
            {!mealPlans.loading && (mealPlans.data ?? []).length === 0 && (
              <div className="mb-8 border border-border bg-white p-5">
                <Label>No meal plan from your specialist yet.</Label>
              </div>
            )}
            {(mealPlans.data ?? []).map((p) => (
              <MealPlanCard key={p.plan_id} plan={p} />
            ))}
          </div>

          <Label>Create a plan</Label>
          <form onSubmit={create} className="mt-4 flex items-end gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <Label>Goal</Label>
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Build strength, 3x/week"
                className="h-[42px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
              />
            </div>
            <Button type="submit" variant="dark" disabled={busy || !goal.trim()}>
              {busy ? "Creating…" : "Create plan"}
            </Button>
            <Button type="button" variant="ghost" disabled={aiBusy || !goal.trim()} onClick={generate}>
              {aiBusy ? "Generating…" : "Generate with AI"}
            </Button>
          </form>
          {formErr && <div className="mt-2 text-[13px] text-coral">{formErr}</div>}
          {aiMsg && <div className="mt-2 text-[13px] text-coral">{aiMsg}</div>}
          {aiPlan && (
            <div className="mt-4 border border-coral bg-white p-5">
              <Label>AI proposed plan — {aiPlan.goal}</Label>
              {(aiPlan.days ?? []).map((d, i) => (
                <div key={i} className="mt-3">
                  <div className="font-sans text-[13px] text-charcoal">{d.day} · {d.focus}</div>
                  {(d.exercises ?? []).map((e, j) => (
                    <div key={j} className="font-sans text-[12px] text-muted">
                      {e.name}{e.sets ? ` — ${e.sets}×${e.reps}` : ""}
                    </div>
                  ))}
                </div>
              ))}
              <div className="mt-4 flex gap-2">
                <Button type="button" variant="dark" onClick={acceptAi}>Accept plan</Button>
                <Button type="button" variant="ghost" onClick={() => setAiPlan(null)}>Discard</Button>
              </div>
            </div>
          )}

          <div className="mt-9">
            <Label>Your plans</Label>
            <Hairline className="mt-2" />
            {loading && <div className="py-6"><Label>Loading…</Label></div>}
            {error && <div className="py-6 text-[13px] text-coral">{error}</div>}
            {!loading && (data ?? []).length === 0 && (
              <EmptyState title="No plans yet">
                Create your first workout plan above with a goal like “Build strength, 3×/week”, then
                schedule its sessions on the calendar.
              </EmptyState>
            )}
            {(data ?? []).map((p) => (
              <div key={p.plan_id}>
                <div className="flex items-center justify-between py-4">
                  {editingId === p.plan_id ? (
                    <input
                      value={editGoal}
                      onChange={(e) => setEditGoal(e.target.value)}
                      className="h-[36px] flex-1 border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
                    />
                  ) : (
                    <div>
                      <div className="font-sans text-[14px] text-charcoal">{p.goal}</div>
                      <div className="mt-1 font-sans text-[11px] text-muted">
                        Created {shortDate(p.created_at)} · via {p.generated_by}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge tone={p.status === "active" ? "good" : "neutral"}>{p.status}</Badge>
                    {editingId === p.plan_id ? (
                      <>
                        <Button type="button" variant="dark" onClick={() => saveEdit(p.plan_id)}>Save</Button>
                        <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" variant="ghost" onClick={() => { setEditingId(p.plan_id); setEditGoal(p.goal); }}>Edit</Button>
                        <Button type="button" variant="ghost" onClick={() => discard(p.plan_id)}>Discard</Button>
                      </>
                    )}
                  </div>
                </div>
                <Hairline />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
