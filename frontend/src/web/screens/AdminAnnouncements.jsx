import React, { useEffect, useState } from "react";
import WebShell, { WAvatar } from "../WebShell";
import { WLabel, WButton, WBadge, WHairline } from "../WebPrimitives";
import { ADMIN_NAV } from "./AdminDashboard";
import { createAnnouncement, listAnnouncements } from "../../api/admin";

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All users" },
  { value: "gym_users", label: "Gym users" },
  { value: "specialists", label: "Specialists" },
];

function fmt(iso) {
  if (!iso) return "Draft";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminAnnouncements({ onNav }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ kind: "idle", message: "" });

  const refresh = async () => {
    try {
      const rows = await listAnnouncements();
      setList(Array.isArray(rows) ? rows : []);
    } catch {
      setList([]);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      setStatus({ kind: "err", message: "Title and body are required." });
      return;
    }
    setBusy(true);
    setStatus({ kind: "idle", message: "" });
    try {
      await createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        target_audience: audience,
      });
      setStatus({ kind: "ok", message: "Announcement broadcast and notifications sent." });
      setTitle("");
      setBody("");
      refresh();
    } catch (e) {
      setStatus({ kind: "err", message: e?.detail || "Failed to publish announcement." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <WebShell
      nav={ADMIN_NAV}
      active="Announcements"
      role="Administrator"
      accent="var(--charcoal)"
      title="Announcements"
      search="Search"
      topRight={<WAvatar letter="S" />}
      onNav={onNav}
    >
      <div style={{ padding: "30px 36px", maxWidth: 900 }}>
        <WLabel>Broadcast a new announcement</WLabel>
        <div style={{ marginTop: 16, border: "1px solid var(--border)", padding: 22 }}>
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              borderBottom: "1px solid var(--border)",
              background: "transparent",
              padding: "8px 0",
              fontFamily: "var(--font-serif)",
              fontSize: 20,
              color: "var(--charcoal)",
              outline: "none",
            }}
          />
          <textarea
            placeholder="Message body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            style={{
              marginTop: 14,
              width: "100%",
              border: "1px solid var(--border)",
              background: "var(--white)",
              padding: 12,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--charcoal)",
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
            }}
          />
          <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <WLabel>Audience</WLabel>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                style={{
                  border: "1px solid var(--border)",
                  background: "transparent",
                  padding: "8px 10px",
                  fontSize: 12,
                  color: "var(--charcoal)",
                  outline: "none",
                }}
              >
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <WButton variant="primary" size="sm" onClick={busy ? undefined : send}>
              {busy ? "Publishing…" : "Publish"}
            </WButton>
          </div>
          {status.kind !== "idle" && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: status.kind === "ok" ? "var(--charcoal)" : "var(--coral)",
              }}
            >
              {status.message}
            </div>
          )}
        </div>

        <div style={{ marginTop: 36 }}>
          <WLabel>Past announcements</WLabel>
          <WHairline />
          {loading && (
            <div style={{ padding: "20px 0", fontSize: 13, color: "var(--muted)" }}>Loading…</div>
          )}
          {!loading && list.length === 0 && (
            <div style={{ padding: "20px 0", fontSize: 13, color: "var(--muted)" }}>
              No announcements yet.
            </div>
          )}
          {list.map((a) => (
            <React.Fragment key={a.announcement_id}>
              <div style={{ padding: "18px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--charcoal)" }}>
                    {a.title}
                  </span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <WBadge tone={a.status === "published" ? "good" : "neutral"}>{a.target_audience}</WBadge>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{fmt(a.sent_at)}</span>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: "var(--charcoal)", lineHeight: 1.6 }}>
                  {a.body}
                </div>
              </div>
              <WHairline />
            </React.Fragment>
          ))}
        </div>
      </div>
    </WebShell>
  );
}
