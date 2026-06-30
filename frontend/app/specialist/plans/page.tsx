"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody } from "@/components/shell/Page";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { useSession } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/client";
import { listMealPlans, listClients, deleteMealPlan } from "@/lib/api/specialist";
import { relativeTime } from "@/lib/format";
import type { ClientSummary, MealPlanOut } from "@/lib/api/types";

export default function MealPlansManagePage() {
  const router = useRouter();
  const { user } = useSession();
  const avatarLetter = (user?.name ?? user?.email ?? "?")[0]?.toUpperCase() ?? "?";

  const { data, error, loading, setData } = useResource<MealPlanOut[]>(listMealPlans, []);
  const clients = useResource<ClientSummary[]>(listClients, []);
  const [err, setErr] = useState<string | null>(null);

  const clientName = useMemo(() => {
    const map = new Map((clients.data ?? []).map((c) => [c.user_id, c.name ?? c.email]));
    return (id: string | null) => (id ? map.get(id) ?? "Assigned client" : "Template");
  }, [clients.data]);

  const plans = data ?? [];

  const remove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this meal plan? This cannot be undone.")) return;
    setErr(null);
    try {
      await deleteMealPlan(id);
      setData((prev) => (prev ?? []).filter((p) => p.plan_id !== id));
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Failed to delete");
    }
  };

  return (
    <>
      <TopBar title="Plans" search="Search plans" avatarLetter={avatarLetter} />
      <PageBody>
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Label>Meal plans · {plans.length}</Label>
              <div className="mt-2 font-serif text-[28px] leading-tight text-charcoal">Your meal plans</div>
              <div className="mt-1.5 max-w-[520px] font-sans text-[13px] text-muted">
                Drafts stay editable until you publish them to a client. Publishing sends the plan
                and notifies the client.
              </div>
            </div>
            <Button size="sm" onClick={() => router.push("/specialist/plans/new")}>+ New plan</Button>
          </div>

          {loading && <div className="py-8"><Label>Loading…</Label></div>}
          {error && <div className="py-8 text-[13px] text-coral">{error}</div>}
          {err && <div className="py-3 text-[13px] text-coral">{err}</div>}
          {!loading && !error && plans.length === 0 && (
            <EmptyState title="No meal plans yet" icon="meals">
              Build your first plan with “+ New plan”, save it as a draft, then publish it to a
              client when it’s ready.
            </EmptyState>
          )}

          {plans.length > 0 && (
          <Card padded={false} className="overflow-x-auto">
          <div className="min-w-[720px]">
          <div
            className="grid items-center px-5 pt-4 pb-3"
            style={{ gridTemplateColumns: "2.4fr 1fr 1.6fr 1.2fr 0.6fr" }}
          >
            {["Plan", "Status", "Client", "Updated", ""].map((h, i) => (
              <Label key={i}>{h}</Label>
            ))}
          </div>
          <Hairline />

          {plans.map((p, i) => (
            <div
              key={p.plan_id}
              onClick={() => router.push(`/specialist/plans/${p.plan_id}`)}
              className="cursor-pointer transition-colors hover:bg-cream-deep"
            >
              {i > 0 && <Hairline />}
              <div
                className="grid items-center px-5 py-[18px]"
                style={{ gridTemplateColumns: "2.4fr 1fr 1.6fr 1.2fr 0.6fr" }}
              >
                <span className="font-serif text-[16px] text-charcoal">{p.name}</span>
                <span>
                  <Badge tone={p.status === "published" ? "live" : "draft"}>
                    {p.status === "published" ? "Published" : "Draft"}
                  </Badge>
                </span>
                <span className="font-sans text-[13px] text-subtle">{clientName(p.client_id)}</span>
                <span className="font-sans text-[13px] text-muted">{relativeTime(p.created_at)}</span>
                <span className="text-right">
                  <button
                    type="button"
                    onClick={(e) => remove(e, p.plan_id)}
                    className="font-sans text-[12px] text-muted underline hover:text-coral"
                  >
                    Delete
                  </button>
                </span>
              </div>
            </div>
          ))}
          </div>
          </Card>
          )}
      </PageBody>
    </>
  );
}
