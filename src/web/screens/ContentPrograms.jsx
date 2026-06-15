import React, { useState } from "react";
import WebShell, { WAvatar } from "../WebShell";
import { WLabel, WButton, WChip, WBadge } from "../WebPrimitives";
import { ADMIN_NAV } from "./AdminDashboard";

const PROGRAMS = [
  { title: "Couch to 5K", audience: "Beginners · Cardio", status: "Published", n: "1,204 enrolled" },
  { title: "Lean & Steady", audience: "Fat loss · All levels", status: "Published", n: "3,488 enrolled" },
  { title: "Strength Foundations", audience: "Build · Intermediate", status: "Published", n: "927 enrolled" },
  { title: "Marathon Block 12", audience: "Endurance · Advanced", status: "Draft", n: "Not live" },
  { title: "Desk Reset Mobility", audience: "Wellness · All levels", status: "Draft", n: "Not live" },
  { title: "Power Hypertrophy", audience: "Build · Advanced", status: "Published", n: "612 enrolled" },
  { title: "Couch to 5K v1", audience: "Beginners · Cardio", status: "Archived", n: "Retired" },
  { title: "Winter Shred 2025", audience: "Fat loss · All levels", status: "Archived", n: "Retired" },
];

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
      <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>{p.audience}</div>
      <div
        style={{
          marginTop: "auto",
          paddingTop: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--subtle)" }}>{p.n}</span>
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

export default function ContentPrograms({ onNav }) {
  const [filter, setFilter] = useState("All");
  const list = filter === "All" ? PROGRAMS : PROGRAMS.filter((p) => p.status === filter);

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
          <WButton variant="primary" size="sm">
            + Create program
          </WButton>
        </div>

        <div className="adm-grid">
          {list.map((p) => (
            <ProgramCard key={p.title} p={p} />
          ))}
        </div>
      </div>
    </WebShell>
  );
}
