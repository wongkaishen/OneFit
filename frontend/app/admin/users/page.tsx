"use client";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar } from "@/components/shell/Avatar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { useResource } from "@/lib/api/useResource";
import { listUsers, setUserStatus } from "@/lib/api/admin";
import { shortDate } from "@/lib/format";
import type { UserOut } from "@/lib/api/types";

const ROLE_FILTERS = ["All roles", "Members", "Specialists", "Admins"];
const roleMatch: Record<string, string> = {
  Members: "gym_user",
  Specialists: "wellness_specialist",
  Admins: "admin",
};
function statusTone(status: string): "good" | "flag" | "neutral" {
  const s = status.toLowerCase();
  if (s === "active") return "good";
  if (s === "suspended") return "flag";
  return "neutral";
}

const GRID = "32px 2fr 1.2fr 1.2fr 1.2fr 1fr 40px";

export default function UserManagementPage() {
  const { data, error, loading, setData } = useResource<UserOut[]>(listUsers, []);
  const [role, setRole] = useState("All roles");
  const [sel, setSel] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const users = useMemo(() => {
    const list = data ?? [];
    if (role === "All roles") return list;
    return list.filter((u) => u.role === roleMatch[role]);
  }, [data, role]);

  const toggle = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const changeStatus = async (id: string, status: string) => {
    setActionErr(null);
    try {
      const updated = await setUserStatus(id, status);
      setData((prev) => (prev ?? []).map((u) => (u.user_id === id ? updated : u)));
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Action failed");
    }
    setMenu(null);
  };

  const bulk = async (status: string) => {
    for (const id of sel) await changeStatus(id, status);
    setSel([]);
  };

  return (
    <>
      <TopBar title="User management" search="Search users" avatarLetter="S" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <div className="mb-[18px] flex items-center justify-between">
            <div className="flex gap-[10px]">
              {ROLE_FILTERS.map((r) => (
                <Chip key={r} active={role === r} onClick={() => setRole(r)}>{r}</Chip>
              ))}
            </div>
            <Label>{users.length} users</Label>
          </div>

          <div
            className="mb-[2px] flex h-12 items-center justify-between px-4 transition"
            style={{ background: sel.length ? "var(--charcoal)" : "transparent", border: sel.length ? "none" : "1px solid var(--border)" }}
          >
            <span className="font-sans text-[12px]" style={{ color: sel.length ? "var(--cream)" : "var(--muted)" }}>
              {sel.length ? `${sel.length} selected` : "Select rows for bulk actions"}
            </span>
            <div className="flex gap-[18px]">
              {(["Suspend", "Activate"] as const).map((a) => (
                <span
                  key={a}
                  onClick={() => sel.length && bulk(a === "Suspend" ? "suspended" : "active")}
                  className="font-sans text-[10px] font-bold uppercase tracking-label"
                  style={{ color: sel.length ? "var(--cream)" : "var(--border)", cursor: sel.length ? "pointer" : "default" }}
                >
                  {a}
                </span>
              ))}
            </div>
          </div>

          {actionErr && <div className="py-2 text-[12px] text-coral">{actionErr}</div>}

          <div className="grid items-center px-1 pb-3 pt-[14px]" style={{ gridTemplateColumns: GRID }}>
            <span />
            {["Name", "Role", "Joined", "Status", "Last active", ""].map((h, i) => <Label key={i}>{h}</Label>)}
          </div>
          <Hairline />

          {loading && <div className="py-8"><Label>Loading…</Label></div>}
          {error && <div className="py-8 text-[13px] text-coral">{error}</div>}

          {users.map((u) => (
            <div key={u.user_id} className="relative">
              <div
                className="grid items-center px-1 py-4"
                style={{ gridTemplateColumns: GRID, background: sel.includes(u.user_id) ? "var(--white)" : "transparent" }}
              >
                <span
                  onClick={() => toggle(u.user_id)}
                  className="inline-flex h-[15px] w-[15px] cursor-pointer items-center justify-center border border-subtle text-[10px] text-cream"
                  style={{ background: sel.includes(u.user_id) ? "var(--charcoal)" : "transparent" }}
                >
                  {sel.includes(u.user_id) ? "✓" : ""}
                </span>
                <div className="flex items-center gap-3">
                  <Avatar letter={(u.name ?? u.email)[0]?.toUpperCase() ?? "?"} />
                  <span className="font-sans text-[14px] text-charcoal">{u.name ?? u.email}</span>
                </div>
                <span className="font-sans text-[13px] text-subtle">{u.role}</span>
                <span className="font-sans text-[13px] text-muted">{shortDate(u.created_at)}</span>
                <span><Badge tone={statusTone(u.status)}>{u.status}</Badge></span>
                <span className="font-sans text-[13px] text-muted">—</span>
                <span
                  onClick={() => setMenu(menu === u.user_id ? null : u.user_id)}
                  className="cursor-pointer text-center text-[18px] tracking-widest text-subtle"
                >
                  ⋯
                </span>
              </div>
              {menu === u.user_id && (
                <div className="absolute right-2 top-[50px] z-20 min-w-[150px] border border-border bg-cream">
                  {(u.status.toLowerCase() === "suspended"
                    ? [["Activate", "active"]]
                    : [["Suspend", "suspended"]]
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      onClick={() => changeStatus(u.user_id, value)}
                      className="cursor-pointer border-b border-border px-4 py-[11px] font-sans text-[13px] text-charcoal"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              )}
              <Hairline />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
