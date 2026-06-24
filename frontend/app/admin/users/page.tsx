"use client";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar } from "@/components/shell/Avatar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { PageIntro } from "@/components/ui/PageIntro";
import { useResource } from "@/lib/api/useResource";
import { listUsers, setUserStatus } from "@/lib/api/admin";
import { shortDate } from "@/lib/format";
import type { UserOut } from "@/lib/api/types";

const ROLE_FILTERS = ["All roles", "Members", "Specialists", "Admins"];
const STATUS_FILTERS = ["All statuses", "Pending", "Active", "Suspended"];
const roleMatch: Record<string, string> = {
  Members: "gym_user",
  Specialists: "wellness_specialist",
  Admins: "admin",
};
const statusMatch: Record<string, string> = {
  Pending: "pending",
  Active: "active",
  Suspended: "suspended",
};
function statusTone(status: string): "good" | "flag" | "neutral" {
  const s = status.toLowerCase();
  if (s === "active") return "good";
  if (s === "suspended") return "flag";
  return "neutral";
}

// Row actions depend on current status (e.g. pending users get Approve/Reject).
function menuActions(status: string): [string, string][] {
  const s = status.toLowerCase();
  if (s === "pending") return [["Approve", "active"], ["Reject", "suspended"]];
  if (s === "suspended") return [["Activate", "active"]];
  return [["Suspend", "suspended"]];
}

const GRID = "32px 2fr 1.2fr 1.2fr 1.2fr 1fr 40px";

export default function UserManagementPage() {
  const { data, error, loading, setData } = useResource<UserOut[]>(listUsers, []);
  const [role, setRole] = useState("All roles");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [sel, setSel] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const users = useMemo(() => {
    let list = data ?? [];
    if (role !== "All roles") list = list.filter((u) => u.role === roleMatch[role]);
    if (statusFilter !== "All statuses")
      list = list.filter((u) => u.status.toLowerCase() === statusMatch[statusFilter]);
    return list;
  }, [data, role, statusFilter]);

  const pendingCount = useMemo(
    () => (data ?? []).filter((u) => u.status.toLowerCase() === "pending").length,
    [data],
  );

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
          <PageIntro>
            Manage member accounts — change a user’s role, and suspend or reactivate access.
            Suspended users are blocked from the app immediately.
          </PageIntro>
          {pendingCount > 0 && (
            <div className="mb-4 flex items-center justify-between border border-border bg-white px-4 py-3">
              <span className="font-sans text-[13px] text-charcoal">
                <b className="font-semibold">{pendingCount}</b> registration
                {pendingCount === 1 ? "" : "s"} awaiting approval
              </span>
              <Chip active={statusFilter === "Pending"} onClick={() => setStatusFilter("Pending")}>
                Review pending
              </Chip>
            </div>
          )}

          <div className="mb-[18px] flex items-center justify-between">
            <div className="flex flex-wrap gap-[10px]">
              {ROLE_FILTERS.map((r) => (
                <Chip key={r} active={role === r} onClick={() => setRole(r)}>{r}</Chip>
              ))}
              <span className="mx-1 w-px self-stretch bg-border" />
              {STATUS_FILTERS.map((s) => (
                <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{s}</Chip>
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
                style={{ gridTemplateColumns: GRID, background: sel.includes(u.user_id) ? "#FFFFFF" : "transparent" }}
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
                  {menuActions(u.status).map(([label, value]) => (
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
