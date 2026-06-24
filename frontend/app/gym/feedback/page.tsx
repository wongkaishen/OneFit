"use client";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/shell/Avatar";
import { useResource } from "@/lib/api/useResource";
import { useSession } from "@/lib/auth/session";
import { listFeedback } from "@/lib/api/gym";
import { relativeTime } from "@/lib/format";
import type { GymFeedback } from "@/lib/api/types";

export default function GymFeedbackPage() {
  const { data, error, loading } = useResource<GymFeedback[]>(listFeedback, []);
  const { user } = useSession();
  const avatarLetter = (user?.name ?? user?.email ?? "?")[0]?.toUpperCase() ?? "?";

  // Notifications deep-link here with ?id=<feedback_id> to highlight one item.
  const highlightId = useSearchParams().get("id");

  const items = data ?? [];

  return (
    <>
      <TopBar title="Feedback" search="Search" avatarLetter={avatarLetter} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[720px] px-9 py-[30px]">
          <Label>Feedback from your specialist</Label>
          <div className="mt-1 max-w-[560px] font-sans text-[13px] leading-relaxed text-muted">
            Notes your wellness specialist has shared with you, newest first. “Plan updated” means
            they also adjusted your program.
          </div>

          <Hairline className="mt-5" />

          {loading && <div className="py-8"><Label>Loading…</Label></div>}
          {error && <div className="py-8 text-[13px] text-coral">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <EmptyState title="No feedback yet">
              When your specialist reviews your progress and sends feedback, it will appear here and
              you’ll get a notification.
            </EmptyState>
          )}

          {items.map((f) => {
            const highlighted = f.feedback_id === highlightId;
            return (
              <div key={f.feedback_id}>
                <div
                  className="flex items-start gap-4 px-3 py-5"
                  style={highlighted ? { background: "var(--good-bg, rgba(0,0,0,0.02))" } : undefined}
                >
                  <Avatar letter={(f.specialist_name ?? "S")[0]?.toUpperCase() ?? "S"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-serif text-[16px] text-charcoal">
                        {f.specialist_name ?? "Your specialist"}
                      </span>
                      <Label>{relativeTime(f.submitted_at)}</Label>
                    </div>
                    <div className="mt-2 whitespace-pre-line font-sans text-[14px] leading-relaxed text-charcoal">
                      {f.notes}
                    </div>
                    {f.plan_updated && (
                      <div className="mt-3">
                        <Badge tone="good">Plan updated</Badge>
                      </div>
                    )}
                  </div>
                </div>
                <Hairline />
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
