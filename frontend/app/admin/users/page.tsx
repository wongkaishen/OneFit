"use client";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Avatar } from "@/components/shell/Avatar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useResource } from "@/lib/api/useResource";
import { listUsers, setUserStatus, setUserRole, getUserActivity } from "@/lib/api/admin";
import { shortDate } from "@/lib/format";
import type { UserOut, AdminUserActivity } from "@/lib/api/types";

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
// Role value -> human label, and the options offered in the row editor.
const ROLE_LABEL: Record<string, string> = {
  gym_user: "Member",
  wellness_specialist: "Specialist",
  admin: "Admin",
};
const ROLE_OPTIONS: [string, string][] = [
  ["gym_user", "Member"],
  ["wellness_specialist", "Specialist"],
  ["admin", "Admin"],
];

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
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [roleMenu, setRoleMenu] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activity, setActivity] = useState<AdminUserActivity | null>(null);

  const view = async (id: string) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id); setActivity(null);
    try { setActivity(await getUserActivity(id)); } catch { setActivity(null); }
  };

  const users = useMemo(() => {
    let list = data ?? [];
    if (role !== "All roles") list = list.filter((u) => u.role === roleMatch[role]);
    if (statusFilter !== "All statuses")
      list = list.filter((u) => u.status.toLowerCase() === statusMatch[statusFilter]);
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter(
        (u) => (u.name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    return list;
  }, [data, role, statusFilter, query]);

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

  const changeRole = async (u: UserOut, role: string) => {
    setRoleMenu(null);
    if (role === u.role) return;
    if (!window.confirm(
      `Change ${u.name ?? u.email} from ${ROLE_LABEL[u.role] ?? u.role} to ${ROLE_LABEL[role] ?? role}?`
    )) return;
    setActionErr(null);
    try {
      const updated = await setUserRole(u.user_id, role);
      setData((prev) => (prev ?? []).map((x) => (x.user_id === u.user_id ? updated : x)));
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Couldn't change role");
    }
  };

  const bulk = async (status: string) => {
    for (const id of sel) await changeStatus(id, status);
    setSel([]);
  };

  return (
    <>
      <TopBar title="User management" search="Search name or email" avatarLetter="A" searchValue={query} onSearch={setQuery} />
      <PageBody>
        <PageHeader eyebrow="User management">
          Manage member accounts — change a user’s role, and suspend or reactivate access.
          Suspended users are blocked from the app immediately.
        </PageHeader>
          {pendingCount > 0 && (
            <div className="mb-4 flex items-center justify-between border border-coral-soft bg-coral-soft px-4 py-3">
              <span className="font-sans text-[13px] text-charcoal">
                <b className="font-semibold">{pendingCount}</b> registration
                {pendingCount === 1 ? "" : "s"} awaiting approval
              </span>
              <Chip active={statusFilter === "Pending"} onClick={() => setStatusFilter("Pending")}>
                Review pending
              </Chip>
            </div>
          )}

          <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
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

          <Card padded={false}>
          <div className="grid items-center px-5 pb-3 pt-[14px]" style={{ gridTemplateColumns: GRID }}>
            <span />
            {["Name", "Role", "Joined", "Status", "Last active", ""].map((h, i) => <Label key={i}>{h}</Label>)}
          </div>
          <Hairline />

          {loading && <div className="p-8"><Label>Loading…</Label></div>}
          {error && <div className="p-8 text-[13px] text-coral">{error}</div>}

          {users.map((u) => (
            <div key={u.user_id} className="relative">
              <div
                className="grid items-center px-5 py-4"
                style={{ gridTemplateColumns: GRID, background: sel.includes(u.user_id) ? "var(--cream-deep)" : "transparent" }}
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
                <span className="relative font-sans text-[13px] text-subtle">
                  <button
                    type="button"
                    onClick={() => setRoleMenu(roleMenu === u.user_id ? null : u.user_id)}
                    className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[13px] text-charcoal transition hover:border-charcoal"
                  >
                    {ROLE_LABEL[u.role] ?? u.role}
                    <span className="text-[9px] text-muted">▾</span>
                  </button>
                  {roleMenu === u.user_id && (
                    <div className="absolute left-0 top-[28px] z-30 min-w-[140px] border border-border bg-cream">
                      {ROLE_OPTIONS.map(([value, label]) => (
                        <div
                          key={value}
                          onClick={() => changeRole(u, value)}
                          className="cursor-pointer border-b border-border px-3 py-2 text-[13px] last:border-b-0"
                          style={{ color: value === u.role ? "var(--muted)" : "var(--charcoal)" }}
                        >
                          {label}{value === u.role ? " ✓" : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </span>
                <span className="font-sans text-[13px] text-muted">{shortDate(u.created_at)}</span>
                <span><Badge tone={statusTone(u.status)}>{u.status}</Badge></span>
                <span className="flex items-center gap-2 font-sans text-[13px] text-muted">
                  <button
                    onClick={() => view(u.user_id)}
                    className="rounded border border-border px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-label text-subtle transition hover:border-charcoal hover:text-charcoal"
                  >
                    {openId === u.user_id ? "Close" : "Activity"}
                  </button>
                </span>
                <span
                  onClick={() => setMenu(menu === u.user_id ? null : u.user_id)}
                  className="cursor-pointer text-center text-[18px] tracking-widest text-subtle"
                >
                  ⋯
                </span>
              </div>
              {openId === u.user_id && (
                <div className="border border-border bg-cream px-4 py-3 text-[13px] text-charcoal">
                  {!activity && <Label>Loading…</Label>}
                  {activity && (
                    <>
                      <div>Recent activity logs: {activity.recent_activity.length}</div>
                      <div>Recent diet logs: {activity.recent_diet.length}</div>
                      <div>Recent progress entries: {activity.recent_progress.length}</div>
                    </>
                  )}
                </div>
              )}
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
          </Card>
      </PageBody>
    </>
  );
}
