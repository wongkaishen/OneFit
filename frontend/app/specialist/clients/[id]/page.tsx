"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BarChart } from "@/components/ui/BarChart";
import { useResource } from "@/lib/api/useResource";
import { getClient, clientActivity, clientProgress, submitFeedback } from "@/lib/api/specialist";
import { relativeTime } from "@/lib/format";
import type { ActivityLog, ClientSummary, ProgressEntry } from "@/lib/api/types";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const client = useResource<ClientSummary>(() => getClient(id), [id]);
  const activity = useResource<ActivityLog[]>(() => clientActivity(id), [id]);
  const progress = useResource<ProgressEntry[]>(() => clientProgress(id), [id]);

  const draftKey = `onefit-feedback-${id}`;
  const [notes, setNotes] = useState(() =>
    typeof window !== "undefined" ? window.localStorage.getItem(draftKey) ?? "" : ""
  );
  const [planUpdated, setPlanUpdated] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const onNotes = (v: string) => {
    setNotes(v);
    if (typeof window !== "undefined") window.localStorage.setItem(draftKey, v);
  };

  const send = async () => {
    if (!notes.trim()) return;
    setSending(true);
    setSendError(null);
    setSent(null);
    try {
      await submitFeedback({ user_id: id, notes, plan_updated: planUpdated });
      setSent("Feedback sent — the client has been notified.");
      onNotes("");
      setPlanUpdated(false);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const c = client.data;
  const weightSeries = (progress.data ?? [])
    .slice()
    .reverse()
    .filter((p) => p.weight != null)
    .map((p, i) => ({ k: `#${i + 1}`, v: Number(p.weight) }));

  return (
    <>
      <TopBar title="Client" search="Search clients" avatarLetter="J" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[26px]">
          <span
            onClick={() => router.push("/specialist/clients")}
            className="cursor-pointer font-sans text-[12px] text-muted"
          >
            ‹ Back to clients
          </span>

          {client.loading && <div className="py-8"><Label>Loading…</Label></div>}
          {client.error && <div className="py-8 text-[13px] text-coral">{client.error}</div>}

          {c && (
            <>
              <div className="my-[20px] mb-[26px] flex items-center justify-between">
                <div className="flex items-center gap-[18px]">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-charcoal font-serif text-[26px] text-charcoal">
                    {(c.name ?? c.email)[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-serif text-[26px] text-charcoal">{c.name ?? c.email}</div>
                    <div className="mt-2 flex items-center gap-4">
                      <Label>Goal · {c.goal ?? "—"}</Label>
                      <Badge tone="good">Plan active</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Hairline />

              <div
                className="mt-[26px] grid gap-0"
                style={{ gridTemplateColumns: "1.3fr 1fr 1fr" }}
              >
                {/* left: weight trend + activity */}
                <div className="border-r border-border pr-8">
                  <Label>Weight trend · recent</Label>
                  <div className="my-[12px] mb-[18px] flex items-baseline gap-[10px]">
                    <span className="font-serif text-[36px] text-charcoal">
                      {c.weight != null ? c.weight.toFixed(1) : "—"}
                    </span>
                  </div>
                  <BarChart data={weightSeries} height={110} />
                  <div className="mt-[26px]">
                    <Label>Recent activity</Label>
                    <div className="mt-[6px]">
                      {(activity.data ?? []).length === 0 && (
                        <div className="py-3"><Label>No activity logged</Label></div>
                      )}
                      {(activity.data ?? []).map((a) => (
                        <div key={a.log_id}>
                          <div className="py-[14px]">
                            <div className="flex items-baseline justify-between">
                              <span className="font-sans text-[13px] text-charcoal">
                                {a.workout_type ?? "Activity"}
                              </span>
                              <Label>{relativeTime(a.log_date)}</Label>
                            </div>
                            <div className="mt-[5px] font-sans text-[12px] text-muted">
                              {[a.duration && `${a.duration} min`,
                                a.calories_burned && `${a.calories_burned} kcal`,
                                a.steps && `${a.steps} steps`]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </div>
                          </div>
                          <Hairline />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* middle: meal plan placeholder (no current-plan endpoint) */}
                <div className="border-r border-border px-8">
                  <Label>Current meal plan</Label>
                  <div className="my-[12px] mb-[4px] font-sans text-[15px] font-semibold text-charcoal">
                    {c.goal ? `Goal: ${c.goal}` : "No active plan"}
                  </div>
                  <div className="mb-[22px] font-sans text-[12px] text-muted">
                    Build a plan from the Plans tab.
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => router.push("/specialist/plans/new")}>
                    Open meal-plan builder
                  </Button>
                </div>

                {/* right: feedback module */}
                <div className="pl-8">
                  <Label>Send feedback</Label>
                  <textarea
                    value={notes}
                    onChange={(e) => onNotes(e.target.value)}
                    placeholder="Write advice or a note for this client…"
                    className="mt-[14px] h-[120px] w-full resize-none border border-border bg-white p-3 font-sans text-[13px] leading-relaxed text-charcoal outline-none focus:border-charcoal"
                  />
                  <label className="mt-3 flex items-center gap-2 font-sans text-[12px] text-subtle">
                    <input
                      type="checkbox"
                      checked={planUpdated}
                      onChange={(e) => setPlanUpdated(e.target.checked)}
                    />
                    I updated their plan
                  </label>
                  <div className="mt-3">
                    <Button size="sm" onClick={send} disabled={sending || !notes.trim()}>
                      {sending ? "Sending…" : "Send feedback"}
                    </Button>
                  </div>
                  {sent && <div className="mt-3 font-sans text-[12px] text-good">{sent}</div>}
                  {sendError && <div className="mt-3 font-sans text-[12px] text-coral">{sendError}</div>}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
