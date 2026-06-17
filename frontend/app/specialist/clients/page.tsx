"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar } from "@/components/shell/Avatar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { useResource } from "@/lib/api/useResource";
import { useSession } from "@/lib/auth/session";
import { listClients } from "@/lib/api/specialist";
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
  const { data, error, loading } = useResource<ClientSummary[]>(listClients, []);

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
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <div className="mb-[22px] flex items-end justify-between">
            <div>
              <Label>Your roster · {data?.length ?? 0} active</Label>
              <div className="mt-2 whitespace-nowrap font-serif text-[26px] text-charcoal">
                {firstName ? `Good to see you, ${firstName}.` : "Good to see you."}
              </div>
            </div>
            <Button size="sm">+ Add client</Button>
          </div>

          <div className="mb-[18px] flex gap-[10px]">
            {FILTERS.map((f) => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
            ))}
          </div>

          <div
            className="grid items-center px-1 pb-3"
            style={{ gridTemplateColumns: "2fr 1fr 1.4fr 1.6fr 1.6fr" }}
          >
            {["Client", "Last active", "Current goal", "Progress", "Alerts"].map((h) => (
              <Label key={h}>{h}</Label>
            ))}
          </div>
          <Hairline />

          {loading && <div className="py-8"><Label>Loading…</Label></div>}
          {error && <div className="py-8 text-[13px] text-coral">{error}</div>}
          {!loading && !error && rows.length === 0 && (
            <div className="py-8"><Label>No clients yet</Label></div>
          )}

          {rows.map(({ c, d }) => (
            <div
              key={c.user_id}
              onClick={() => router.push(`/specialist/clients/${c.user_id}`)}
              className="cursor-pointer"
            >
              <div
                className="grid items-center px-1 py-[18px]"
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
                <span>
                  {d.alert ? <Badge tone="warn">{d.alert}</Badge> : <span className="text-[12px] text-border">—</span>}
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
