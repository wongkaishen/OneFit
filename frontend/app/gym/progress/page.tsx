"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { listProgress, addProgress, listMilestones } from "@/lib/api/gym";
import { relativeTime, shortDate } from "@/lib/format";
import { BarChart } from "@/components/ui/BarChart";
import type { GymProgressEntry, GymMilestone } from "@/lib/api/types";

export default function GymProgressPage() {
  const progress = useResource<GymProgressEntry[]>(listProgress, []);
  const milestones = useResource<GymMilestone[]>(listMilestones, []);

  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState<string | null>(null);

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const entry = await addProgress({ weight: num(weight), body_fat_percent: num(bodyFat) });
      progress.setData((prev) => [entry, ...(prev ?? [])]);
      setWeight(""); setBodyFat("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save entry");
    } finally {
      setBusy(false);
    }
  };

  // Build a meaningful multi-line summary: latest measurements, the trend since
  // the previous check-in, recent milestones, and how many entries are logged.
  const buildSummary = (): string => {
    const entries = progress.data ?? [];
    const latest = entries[0];
    if (!latest) return "";
    const lines: string[] = ["My OneFit progress"];

    const measures: string[] = [];
    if (latest.weight != null) measures.push(`weight ${latest.weight} kg`);
    if (latest.body_fat_percent != null) measures.push(`body fat ${latest.body_fat_percent}%`);
    if (measures.length) lines.push(measures.join(" · "));

    const prev = entries[1];
    if (prev && latest.weight != null && prev.weight != null) {
      const delta = Number((latest.weight - prev.weight).toFixed(1));
      if (delta !== 0) lines.push(`${delta > 0 ? "+" : ""}${delta} kg since last check-in`);
    }

    const recent = (milestones.data ?? []).slice(0, 2).map((m) => m.badge ?? m.type);
    if (recent.length) lines.push(`Milestones: ${recent.join(", ")}`);

    lines.push(`${entries.length} check-in${entries.length === 1 ? "" : "s"} logged`);
    return lines.join("\n");
  };

  // Prefer the native share sheet (mobile); fall back to clipboard, then to display.
  const share = async () => {
    const text = buildSummary();
    if (!text) {
      setShared("Add a progress entry first, then you can share it.");
      return;
    }
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "My OneFit progress", text });
        setShared("Shared.");
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return; // user cancelled
        // otherwise fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShared("Progress summary copied to clipboard.");
    } catch {
      setShared(text);
    }
  };

  const weightSeries = [...(progress.data ?? [])]
    .filter((e) => e.weight != null)
    .reverse()
    .slice(-8)
    .map((e) => ({ k: shortDate(e.recorded_at), v: Number(e.weight) }));

  return (
    <>
      <TopBar title="Progress" search="Search" avatarLetter="G" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <PageIntro>
            Record your weight and body fat over time, celebrate milestones, and share a summary of
            your progress. “Share latest” opens your device’s share sheet where supported.
          </PageIntro>
          <Label>Update progress</Label>
          <form onSubmit={add} className="mt-4 flex items-end gap-3">
            <div className="flex flex-col gap-2">
              <Label>Weight (kg)</Label>
              <input
                type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                className="h-[42px] w-[160px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Body fat (%)</Label>
              <input
                type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)}
                className="h-[42px] w-[160px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
              />
            </div>
            <Button type="submit" variant="dark" disabled={busy}>
              {busy ? "Saving…" : "Add entry"}
            </Button>
            <Button type="button" variant="ghost" onClick={share}>Share latest</Button>
          </form>
          {error && <div className="mt-2 text-[13px] text-coral">{error}</div>}
          {shared && <div className="mt-2 text-[13px] text-good">{shared}</div>}

          {weightSeries.length > 0 && (
            <div className="mt-6 border border-border bg-white p-5">
              <Label>Weight trend</Label>
              <div className="mt-4">
                <BarChart data={weightSeries} />
              </div>
            </div>
          )}

          <div className="mt-9 grid grid-cols-2 gap-9">
            <div>
              <Label>History</Label>
              <Hairline className="mt-2" />
              {progress.loading && <div className="py-6"><Label>Loading…</Label></div>}
              {progress.error && <div className="py-6 text-[13px] text-coral">{progress.error}</div>}
              {!progress.loading && (progress.data ?? []).length === 0 && (
                <div className="py-6"><Label>No entries yet</Label></div>
              )}
              {(progress.data ?? []).map((p) => (
                <div key={p.progress_id}>
                  <div className="flex items-center justify-between py-3">
                    <span className="font-sans text-[14px] text-charcoal">
                      {p.weight != null ? `${p.weight} kg` : "—"}
                      {p.body_fat_percent != null ? ` · ${p.body_fat_percent}% bf` : ""}
                    </span>
                    <Label>{relativeTime(p.recorded_at)}</Label>
                  </div>
                  <Hairline />
                </div>
              ))}
            </div>

            <div>
              <Label>Milestones</Label>
              <Hairline className="mt-2" />
              {milestones.loading && <div className="py-6"><Label>Loading…</Label></div>}
              {!milestones.loading && (milestones.data ?? []).length === 0 && (
                <div className="py-6"><Label>No milestones yet</Label></div>
              )}
              {(milestones.data ?? []).map((m) => (
                <div key={m.milestone_id}>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-sans text-[14px] text-charcoal">{m.badge ?? "Milestone"}</div>
                    </div>
                    <Badge tone="good">{relativeTime(m.achieved_at)}</Badge>
                  </div>
                  <Hairline />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
