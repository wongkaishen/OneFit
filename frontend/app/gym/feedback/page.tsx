"use client";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
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
      <PageBody max="form">
        <PageHeader eyebrow="Feedback from your specialist">
          Notes your wellness specialist has shared with you, newest first. “Plan updated” means
          they also adjusted your program.
        </PageHeader>

          {loading && <div className="py-8"><Label>Loading…</Label></div>}
          {error && <div className="py-8 text-[13px] text-coral">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <EmptyState title="No feedback yet" icon="feedback">
              When your specialist reviews your progress and sends feedback, it will appear here and
              you’ll get a notification.
            </EmptyState>
          )}

          {items.length > 0 && (
          <Card padded={false}>
          {items.map((f, idx) => {
            const highlighted = f.feedback_id === highlightId;
            return (
              <div key={f.feedback_id}>
                {idx > 0 && <Hairline />}
                <div
                  className={`flex items-start gap-4 px-5 py-5 ${highlighted ? "bg-coral-soft/40" : ""}`}
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
              </div>
            );
          })}
          </Card>
          )}
      </PageBody>
    </>
  );
}
