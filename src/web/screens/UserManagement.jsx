import React, { useEffect, useState } from "react";
import WebShell, { WAvatar } from "../WebShell";
import { WLabel, WChip, WBadge, WHairline } from "../WebPrimitives";
import { ADMIN_NAV } from "./AdminDashboard";
import { getUsers, setUserStatus } from "../../api/admin";

const ROLES = ["All roles", "Members", "Specialists", "Admins"];
const ROLE_FILTER = {
  "All roles": null,
  Members: "gym_user",
  Specialists: "wellness_specialist",
  Admins: "admin",
};
const ROLE_LABEL = { gym_user: "Member", wellness_specialist: "Specialist", admin: "Admin" };
const STATUS_LABEL = { active: "Active", suspended: "Suspended", pending: "Pending" };
const STATUS_TONE = { active: "good", suspended: "flag", pending: "neutral" };
const GRID = "32px 2fr 1.2fr 1.2fr 1.2fr 1fr 40px";

function joined(createdAt) {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// The status action available for a user, given its current status.
function nextAction(status) {
  if (status === "pending") return { label: "Approve", to: "active" };
  if (status === "suspended") return { label: "Reinstate", to: "active" };
  return { label: "Suspend", to: "suspended" };
}

export default function UserManagement({ onNav }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [sel, setSel] = useState(new Set());
  const [menu, setMenu] = useState(null);

  const refresh = async () => {
    try {
      const r = await getUsers();
      setUsers(Array.isArray(r) ? r : []);
    } catch {
      setUsers([]);
    }
  };
  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    const next = new Set(sel);
    next.has(id) ? next.delete(id) : next.add(id);
    setSel(next);
  };

  // Optimistically flip status, then persist; reload on failure.
  const applyStatus = async (ids, to) => {
    setMenu(null);
    const idSet = new Set(ids);
    setUsers((prev) => prev.map((u) => (idSet.has(u.user_id) ? { ...u, status: to } : u)));
    try {
      await Promise.all(ids.map((id) => setUserStatus(id, to)));
    } catch {
      refresh();
    }
  };

  const wanted = ROLE_FILTER[roleFilter];
  const list = wanted ? users.filter((u) => u.role === wanted) : users;
  const hasSel = sel.size > 0;
  const selIds = [...sel];

  return (
    <WebShell
      nav={ADMIN_NAV}
      active="Users"
      role="Administrator"
      accent="var(--charcoal)"
      title="User management"
      search="Search users"
      topRight={<WAvatar letter="S" />}
      onNav={onNav}
    >
      <div style={{ padding: "30px 36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {ROLES.map((r) => (
              <WChip key={r} active={r === roleFilter} onClick={() => setRoleFilter(r)}>
                {r}
              </WChip>
            ))}
          </div>
          <WLabel>{loading ? "Loading…" : `${list.length} users`}</WLabel>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 48,
            padding: "0 16px",
            marginBottom: 2,
            border: hasSel ? "none" : "1px solid var(--border)",
            background: hasSel ? "var(--charcoal)" : "transparent",
            color: hasSel ? "var(--cream)" : "var(--muted)",
            transition: "background .12s ease, color .12s ease, border .12s ease",
          }}
        >
          <span style={{ fontSize: 12 }}>
            {hasSel ? `${sel.size} selected` : "Select rows for bulk actions"}
          </span>
          <div style={{ display: "flex", gap: 18 }}>
            {[
              { label: "Suspend", to: "suspended" },
              { label: "Activate", to: "active" },
            ].map((a) => (
              <span
                key={a.label}
                onClick={() => {
                  if (hasSel) {
                    applyStatus(selIds, a.to);
                    setSel(new Set());
                  }
                }}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: hasSel ? "var(--cream)" : "var(--border)",
                  cursor: hasSel ? "pointer" : "default",
                }}
              >
                {a.label}
              </span>
            ))}
          </div>
        </div>

        <div className="ws-tablewrap">
         <div className="ws-table">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: GRID,
            padding: "14px 4px 12px",
            gap: 10,
          }}
        >
          <span />
          <WLabel>Name ↓</WLabel>
          <WLabel>Role</WLabel>
          <WLabel>Joined</WLabel>
          <WLabel>Status</WLabel>
          <WLabel>Email</WLabel>
          <span />
        </div>
        <WHairline />

        {loading && (
          <div style={{ padding: "28px 4px", fontSize: 13, color: "var(--muted)" }}>
            Loading users…
          </div>
        )}

        {!loading && list.length === 0 && (
          <div style={{ padding: "28px 4px", fontSize: 13, color: "var(--muted)" }}>
            No users found.
          </div>
        )}

        {list.map((u) => {
          const selected = sel.has(u.user_id);
          const action = nextAction(u.status);
          return (
            <React.Fragment key={u.user_id}>
              <div
                style={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: GRID,
                  alignItems: "center",
                  padding: "16px 4px",
                  gap: 10,
                  background: selected ? "var(--white)" : "transparent",
                }}
              >
                <span
                  onClick={() => toggle(u.user_id)}
                  style={{
                    width: 15,
                    height: 15,
                    border: "1px solid var(--subtle)",
                    background: selected ? "var(--charcoal)" : "transparent",
                    color: "var(--cream)",
                    fontSize: 11,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {selected ? "✓" : ""}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <WAvatar letter={(u.name || "?")[0]} />
                  <span style={{ fontSize: 14, color: "var(--charcoal)" }}>{u.name}</span>
                </div>
                <span style={{ fontSize: 13, color: "var(--subtle)" }}>
                  {ROLE_LABEL[u.role] ?? u.role}
                </span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{joined(u.created_at)}</span>
                <div>
                  <WBadge tone={STATUS_TONE[u.status] ?? "neutral"}>
                    {STATUS_LABEL[u.status] ?? u.status}
                  </WBadge>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {u.email}
                </span>
                <span
                  onClick={() => setMenu(menu === u.user_id ? null : u.user_id)}
                  style={{
                    fontSize: 18,
                    color: "var(--subtle)",
                    letterSpacing: 1,
                    cursor: "pointer",
                    textAlign: "right",
                  }}
                >
                  ⋯
                </span>

                {menu === u.user_id && (
                  <div
                    style={{
                      position: "absolute",
                      right: 8,
                      top: 50,
                      background: "var(--cream)",
                      border: "1px solid var(--border)",
                      zIndex: 20,
                      minWidth: 150,
                    }}
                  >
                    <MenuItem onClick={() => setMenu(null)}>View profile</MenuItem>
                    <MenuItem onClick={() => applyStatus([u.user_id], action.to)}>
                      {action.label}
                    </MenuItem>
                    <MenuItem onClick={() => setMenu(null)}>Reset password</MenuItem>
                  </div>
                )}
              </div>
              <WHairline />
            </React.Fragment>
          );
        })}
         </div>
        </div>
      </div>
    </WebShell>
  );
}

function MenuItem({ children, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "11px 16px",
        fontSize: 13,
        color: "var(--charcoal)",
        borderBottom: "1px solid var(--border)",
        cursor: "pointer",
      }}
    >
      {children}
    </div>
  );
}
