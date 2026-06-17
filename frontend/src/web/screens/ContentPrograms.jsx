import React, { useEffect, useState } from "react";
import WebShell, { WAvatar } from "../WebShell";
import { WLabel, WButton, WChip, WBadge } from "../WebPrimitives";
import { ADMIN_NAV } from "./AdminDashboard";
import { listContent, createContent } from "../../api/specialist";

const FILTERS = ["All", "Draft", "Published", "Archived"];
const STATUS_TONE = { Published: "live", Draft: "draft", Archived: "archived" };

function ProgramCard({ p }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        padding: "22px 22px 18px",
        display: "flex",
        flexDirection: "column",
        minHeight: 150,
      }}
    >
      <div>
        <WBadge tone={STATUS_TONE[p.status]}>{p.status}</WBadge>
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: "var(--font-sans)",
          fontWeight: 600,
          fontSize: 18,
          color: "var(--charcoal)",
        }}
      >
        {p.title}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>{p.category}</div>
      <div
        style={{
          marginTop: "auto",
          paddingTop: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--subtle)" }}>
          {new Date(p.created_at).toLocaleDateString()}
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "var(--charcoal)",
            borderBottom: "1px solid var(--charcoal)",
            paddingBottom: 2,
            cursor: "pointer",
          }}
        >
          Edit
        </span>
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Mental resilience");
  const [permission, setPermission] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      setErr("Title and body are required.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const created = await createContent({
        title: title.trim(),
        body: body.trim(),
        category,
        permission_confirmed: permission,
      });
      onCreated(created);
    } catch (e) {
      setErr(e.detail || "Failed to create content.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(28,28,28,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--cream)",
          border: "1px solid var(--charcoal)",
          width: "min(520px, 100%)",
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <WLabel>New educational content</WLabel>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
        >
          {["Mental resilience", "Self-care", "Nutrition", "Recovery", "Mobility"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <textarea
          placeholder="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          style={{ ...inputStyle, padding: 12, resize: "vertical" }}
        />
        <label style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--muted)" }}>
          <input
            type="checkbox"
            checked={permission}
            onChange={(e) => setPermission(e.target.checked)}
          />
          I confirm I have legal permission to publish this content.
        </label>
        {err && <div style={{ fontSize: 12, color: "var(--coral)" }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <WButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </WButton>
          <WButton variant="primary" size="sm" onClick={busy ? undefined : submit}>
            {busy ? "Saving…" : "Save draft"}
          </WButton>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  height: 38,
  border: "1px solid var(--border)",
  background: "var(--white)",
  padding: "0 12px",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--charcoal)",
  outline: "none",
};

export default function ContentPrograms({ onNav }) {
  const [filter, setFilter] = useState("All");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    listContent()
      .then((r) => setItems(Array.isArray(r) ? r : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const list = filter === "All" ? items : items.filter((p) => p.status === filter);

  return (
    <WebShell
      nav={ADMIN_NAV}
      active="Content"
      role="Administrator"
      accent="var(--charcoal)"
      title="Content & programs"
      search="Search programs"
      topRight={<WAvatar letter="S" />}
      onNav={onNav}
    >
      <div style={{ padding: "30px 36px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 22,
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            {FILTERS.map((f) => (
              <WChip key={f} active={f === filter} onClick={() => setFilter(f)}>
                {f}
              </WChip>
            ))}
          </div>
          <WButton variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            + Create program
          </WButton>
        </div>

        {loading && (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
            Loading…
          </div>
        )}
        {!loading && list.length === 0 && (
          <div style={{ padding: 60, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            No content yet. Click "Create program" to publish your first.
          </div>
        )}

        <div className="adm-grid">
          {list.map((p) => (
            <ProgramCard key={p.content_id} p={p} />
          ))}
        </div>
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(c) => {
            setItems((prev) => [c, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </WebShell>
  );
}
