"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <div className="mb-[22px] flex items-end justify-between">
            <div>
              <Label>Meal plans · {plans.length}</Label>
              <div className="mt-2 font-serif text-[26px] text-charcoal">Your meal plans</div>
              <div className="mt-1 max-w-[520px] font-sans text-[13px] text-muted">
                Drafts stay editable until you publish them to a client. Publishing sends the plan
                and notifies the client.
              </div>
            </div>
            <Button size="sm" onClick={() => router.push("/specialist/plans/new")}>+ New plan</Button>
          </div>

          <div
            className="grid items-center px-1 pb-3"
            style={{ gridTemplateColumns: "2.4fr 1fr 1.6fr 1.2fr 0.6fr" }}
          >
            {["Plan", "Status", "Client", "Updated", ""].map((h, i) => (
              <Label key={i}>{h}</Label>
            ))}
          </div>
          <Hairline />

          {loading && <div className="py-8"><Label>Loading…</Label></div>}
          {error && <div className="py-8 text-[13px] text-coral">{error}</div>}
          {err && <div className="py-3 text-[13px] text-coral">{err}</div>}
          {!loading && !error && plans.length === 0 && (
            <EmptyState title="No meal plans yet">
              Build your first plan with “+ New plan”, save it as a draft, then publish it to a
              client when it’s ready.
            </EmptyState>
          )}

          {plans.map((p) => (
            <div
              key={p.plan_id}
              onClick={() => router.push(`/specialist/plans/${p.plan_id}`)}
              className="cursor-pointer"
            >
              <div
                className="grid items-center px-1 py-[18px]"
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
              <Hairline />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
