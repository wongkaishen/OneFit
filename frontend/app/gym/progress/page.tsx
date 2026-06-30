"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Card, CardHeader } from "@/components/ui/Card";
import { FormField, Input, FileInput } from "@/components/ui/Field";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { listProgress, addProgress, listMilestones, uploadProgressPhoto } from "@/lib/api/gym";
import { relativeTime, shortDate } from "@/lib/format";
import { BarChart } from "@/components/ui/BarChart";
import { renderShareGraphic } from "@/lib/shareGraphic";
import type { GymProgressEntry, GymMilestone } from "@/lib/api/types";

export default function GymProgressPage() {
  const router = useRouter();
  const progress = useResource<GymProgressEntry[]>(listProgress, []);
  const milestones = useResource<GymMilestone[]>(listMilestones, []);

  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState<string | null>(null);

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { photo_url } = await uploadProgressPhoto(file);
      setPhotoUrl(photo_url);
    } catch {
      setError("Photo upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const entry = await addProgress({ weight: num(weight), body_fat_percent: num(bodyFat), photo_url: photoUrl ?? undefined });
      progress.setData((prev) => [entry, ...(prev ?? [])]);
      setWeight(""); setBodyFat(""); setPhotoUrl(null);
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

  const latestWeightLabel = (): string => {
    const latest = (progress.data ?? [])[0];
    if (!latest) return "No data yet";
    const parts: string[] = [];
    if (latest.weight != null) parts.push(`${latest.weight} kg`);
    if (latest.body_fat_percent != null) parts.push(`${latest.body_fat_percent}% bf`);
    return parts.length ? parts.join(" · ") : "Check-in logged";
  };

  const trendLabel = (): string => {
    const entries = progress.data ?? [];
    const latest = entries[0];
    const prev = entries[1];
    if (!latest || !prev || latest.weight == null || prev.weight == null) return "OneFit progress";
    const delta = Number((latest.weight - prev.weight).toFixed(1));
    if (delta === 0) return "No change since last check-in";
    return `${delta > 0 ? "+" : ""}${delta} kg since last check-in`;
  };

  const shareToCommunity = () => {
    const text = buildSummary();
    if (!text) { setShared("Add a progress entry first, then you can share it."); return; }
    router.push(`/gym/community?share=${encodeURIComponent(text)}`);
  };

  const downloadGraphic = () => {
    const url = renderShareGraphic({ line1: latestWeightLabel(), line2: trendLabel() });
    if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = "onefit-progress.png"; a.click();
  };

  // Download a badge for ANY past check-in (not just the latest). `idx` is the
  // index in the newest-first history list, so the previous entry is idx+1.
  const downloadBadgeFor = (entry: GymProgressEntry, idx: number) => {
    const parts: string[] = [];
    if (entry.weight != null) parts.push(`${entry.weight} kg`);
    if (entry.body_fat_percent != null) parts.push(`${entry.body_fat_percent}% bf`);
    const line1 = parts.length ? parts.join(" · ") : "Check-in logged";

    const entries = progress.data ?? [];
    const prev = entries[idx + 1];
    let line2 = `Recorded ${shortDate(entry.recorded_at)}`;
    if (prev && entry.weight != null && prev.weight != null) {
      const delta = Number((entry.weight - prev.weight).toFixed(1));
      if (delta !== 0) line2 = `${delta > 0 ? "+" : ""}${delta} kg vs previous check-in`;
    }
    const url = renderShareGraphic({ line1, line2 });
    if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = `onefit-progress-${shortDate(entry.recorded_at)}.png`; a.click();
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
      <PageBody>
        <PageHeader eyebrow="Progress">
          Record your weight and body fat over time, celebrate milestones, and share a summary of
          your progress. “Share latest” opens your device’s share sheet where supported.
        </PageHeader>
          <Card>
          <CardHeader eyebrow="Update progress" title="New check-in" />
          <form onSubmit={add} className="mt-6 flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Weight (kg)">
                <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </FormField>
              <FormField label="Body fat (%)">
                <Input type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
              </FormField>
            </div>
            <FormField label="Progress photo (optional)">
              <FileInput accept="image/*" onChange={onPickPhoto} />
              {uploading && <Label>Uploading…</Label>}
              {photoUrl && <img src={photoUrl} alt="progress" className="mt-2 h-24 w-24 object-cover" />}
            </FormField>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="dark" disabled={busy || uploading}>
                {busy ? "Saving…" : "Add entry"}
              </Button>
              <Button type="button" variant="ghost" onClick={share}>Share latest</Button>
              <Button type="button" variant="dark" onClick={shareToCommunity}>Share to community</Button>
              <Button type="button" variant="ghost" onClick={downloadGraphic}>Download graphic</Button>
            </div>
          </form>
          </Card>
          {error && <div className="mt-2 text-[13px] text-coral">{error}</div>}
          {shared && <div className="mt-2 text-[13px] text-good">{shared}</div>}

          {weightSeries.length > 0 && (
            <Card className="mt-6">
              <CardHeader eyebrow="Weight trend" />
              <div className="mt-4">
                <BarChart data={weightSeries} scaleFromMin />
              </div>
              <div className="mt-3 font-sans text-[11px] text-muted">
                Bars are scaled to your weight range so small changes are easy to see.
              </div>
            </Card>
          )}

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader eyebrow="History" />
              {progress.loading && <div className="py-6"><Label>Loading…</Label></div>}
              {progress.error && <div className="py-6 text-[13px] text-coral">{progress.error}</div>}
              {!progress.loading && (progress.data ?? []).length === 0 && (
                <div className="py-6"><Label>No entries yet</Label></div>
              )}
              <div className="mt-3">
              {(progress.data ?? []).map((p, idx) => (
                <div key={p.progress_id}>
                  <div className="flex items-center justify-between py-3">
                    <span className="font-sans text-[14px] text-charcoal">
                      {p.weight != null ? `${p.weight} kg` : "—"}
                      {p.body_fat_percent != null ? ` · ${p.body_fat_percent}% bf` : ""}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => downloadBadgeFor(p, idx)}
                        className="font-sans text-[10px] font-bold uppercase tracking-label text-coral hover:underline"
                      >
                        Badge
                      </button>
                      <Label>{relativeTime(p.recorded_at)}</Label>
                    </div>
                  </div>
                  <Hairline />
                </div>
              ))}
              </div>
            </Card>

            <Card>
              <CardHeader eyebrow="Milestones" />
              <div className="mt-3">
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
            </Card>
          </div>
      </PageBody>
    </>
  );
}
