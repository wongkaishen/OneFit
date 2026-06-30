"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody } from "@/components/shell/Page";
import { Avatar } from "@/components/shell/Avatar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { useSession } from "@/lib/auth/session";
import { listClients, addClient, removeClient } from "@/lib/api/specialist";
import { ApiError } from "@/lib/api/client";
import { relativeTime } from "@/lib/format";
import type { ClientSummary } from "@/lib/api/types";

// Client-side heuristic until the backend exposes a progress field (documented in spec).
function derive(c: ClientSummary): { pct: number; alert: string | null } {
  const ms = c.last_active_at ? Date.now() - new Date(c.last_active_at).getTime() : Infinity;
  const days = ms / 86400000;
  let pct = 60;
  if (days < 1) pct = 85;
  else if (days < 3) pct = 60;
  else if (days < 7) pct = 35;
  else pct = 12;
  let alert: string | null = null;
  if (days >= 5) alert = `Inactive ${Math.floor(days)} days`;
  return { pct, alert };
}

const FILTERS = ["All clients", "On track", "At risk", "New this week"];

export default function ClientListPage() {
  const router = useRouter();
  const [filter, setFilter] = useState("All clients");
  const { user } = useSession();
  const { data, error, loading, setData } = useResource<ClientSummary[]>(listClients, []);

  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddErr(null);
    setAddBusy(true);
    try {
      const client = await addClient(email.trim());
      setData((prev) =>
        [...(prev ?? []).filter((c) => c.user_id !== client.user_id), client].sort((a, b) =>
          (a.name ?? a.email).localeCompare(b.name ?? b.email),
        ),
      );
      setEmail("");
      setAdding(false);
    } catch (err) {
      setAddErr(err instanceof ApiError ? err.message : "Failed to add client");
    } finally {
      setAddBusy(false);
    }
  };

  const remove = async (e: React.MouseEvent, c: ClientSummary) => {
    e.stopPropagation();
    if (!window.confirm(`Remove ${c.name ?? c.email} from your roster?`)) return;
    try {
      await removeClient(c.user_id);
      setData((prev) => (prev ?? []).filter((x) => x.user_id !== c.user_id));
    } catch (err) {
      setAddErr(err instanceof ApiError ? err.message : "Failed to remove client");
    }
  };

  const displayName = user?.name ?? user?.email ?? null;
  const firstName = displayName?.split(/[\s@]/)[0] ?? null;
  const avatarLetter = displayName?.[0]?.toUpperCase() ?? "?";

  const rows = useMemo(() => {
    const list = (data ?? []).map((c) => ({ c, d: derive(c) }));
    if (filter === "On track") return list.filter((r) => r.d.pct >= 60);
    if (filter === "At risk") return list.filter((r) => r.d.alert !== null);
    return list;
  }, [data, filter]);

  return (
    <>
      <TopBar title="Clients" search="Search clients" avatarLetter={avatarLetter} />
      <PageBody>
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Label>Your roster · {data?.length ?? 0} active</Label>
              <div className="mt-2 font-serif text-[28px] leading-tight text-charcoal">
                {firstName ? `Good to see you, ${firstName}.` : "Good to see you."}
              </div>
            </div>
            <Button size="sm" onClick={() => { setAdding((v) => !v); setAddErr(null); }}>
              {adding ? "Close" : "+ Add client"}
            </Button>
          </div>

          {adding && (
            <Card className="mb-5">
              <form onSubmit={submitAdd} className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
                <FormField label="Client email" className="flex-1">
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@email.com" />
                </FormField>
                <Button type="submit" size="md" disabled={addBusy}>
                  {addBusy ? "Adding…" : "Add to roster"}
                </Button>
              </form>
              <div className="mt-2 font-sans text-[12px] text-muted">
                Adds an existing gym user by their account email.
              </div>
            </Card>
          )}
          {addErr && <div className="mb-3 font-sans text-[13px] text-coral">{addErr}</div>}

          <div className="mb-3 flex flex-wrap gap-[10px]">
            {FILTERS.map((f) => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
            ))}
          </div>
          <div className="mb-4 font-sans text-[11px] text-muted">
            “At risk” / the Alerts column flags clients who haven’t logged any activity for 5+ days,
            so you know who to check in on.
          </div>

          {loading && <div className="py-8"><Label>Loading…</Label></div>}
          {error && <div className="py-8 text-[13px] text-coral">{error}</div>}
          {!loading && !error && rows.length === 0 && (
            <EmptyState title="No clients yet" icon="clients">
              Add your first client by their account email with “+ Add client” above. They’ll be
              notified and appear here.
            </EmptyState>
          )}

          {rows.length > 0 && (
          <Card padded={false} className="overflow-x-auto">
          <div className="min-w-[760px]">
          <div
            className="grid items-center px-5 pt-4 pb-3"
            style={{ gridTemplateColumns: "2fr 1fr 1.4fr 1.6fr 1.6fr" }}
          >
            {["Client", "Last active", "Current goal", "Progress", "Alerts"].map((h) => (
              <Label key={h}>{h}</Label>
            ))}
          </div>
          <Hairline />

          {rows.map(({ c, d }, i) => (
            <div
              key={c.user_id}
              onClick={() => router.push(`/specialist/clients/${c.user_id}`)}
              className="cursor-pointer transition-colors hover:bg-cream-deep"
            >
              {i > 0 && <Hairline />}
              <div
                className="grid items-center px-5 py-[18px]"
                style={{ gridTemplateColumns: "2fr 1fr 1.4fr 1.6fr 1.6fr" }}
              >
                <div className="flex items-center gap-3">
                  <Avatar letter={(c.name ?? c.email)[0]?.toUpperCase() ?? "?"} />
                  <span className="font-serif text-[16px] text-charcoal">{c.name ?? c.email}</span>
                </div>
                <span className="font-sans text-[13px] text-muted">{relativeTime(c.last_active_at)}</span>
                <span className="font-sans text-[13px] text-subtle">{c.goal ?? "—"}</span>
                <div className="flex items-center gap-3">
                  <Progress pct={d.pct} className="!w-[90px]" />
                  <span className="font-sans text-[13px] font-semibold text-charcoal">{d.pct}%</span>
                </div>
                <span className="flex items-center justify-between gap-3">
                  {d.alert ? <Badge tone="warn">{d.alert}</Badge> : <span className="text-[12px] text-border-strong">—</span>}
                  <button
                    type="button"
                    onClick={(e) => remove(e, c)}
                    className="font-sans text-[12px] text-muted underline hover:text-coral"
                  >
                    Remove
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
