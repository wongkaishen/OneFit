import React from "react";
import WebShell from "../WebShell";
import { WLabel, WButton, WBadge, WHairline, WProgress, WBarChart } from "../WebPrimitives";
import { WELLNESS_NAV } from "./ClientList";

function MacroLine({ label, value, pct }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <WLabel>{label}</WLabel>
        <span style={{ fontWeight: 600, fontSize: 12, color: "var(--charcoal)" }}>{value}</span>
      </div>
      <WProgress pct={pct} width="100%" />
    </div>
  );
}

function ActivityLogRow({ name, date, meta }) {
  return (
    <div style={{ padding: "14px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--charcoal)" }}>
          {name}
        </span>
        <WLabel>{date}</WLabel>
      </div>
      <div style={{ marginTop: 5, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--muted)" }}>
        {meta}
      </div>
    </div>
  );
}

const CHART = [
  { v: 72, label: "W17" },
  { v: 71, label: "W18" },
  { v: 70.5, label: "W19" },
  { v: 69.5, label: "W20" },
  { v: 69, label: "W21" },
  { v: 68, label: "W22" },
];

export default function ClientDetail({ client, onBack, onNav }) {
  const c = client || { name: "Alex Tan", goal: "Lose fat", pct: 73 };

  return (
    <WebShell
      nav={WELLNESS_NAV}
      active="Clients"
      role="Wellness Specialist"
      title="Client"
      search="Search clients"
      onNav={onNav}
    >
      <div style={{ padding: "26px 36px" }}>
        <span
          onClick={onBack}
          style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--muted)", cursor: "pointer" }}
        >
          ‹ Back to clients
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "20px 0 26px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: "1px solid var(--charcoal)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-serif)",
                fontSize: 26,
                color: "var(--charcoal)",
              }}
            >
              {c.name[0]}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 26, color: "var(--charcoal)" }}>
                {c.name}
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 16 }}>
                <WLabel>Goal · {c.goal}</WLabel>
                <WBadge tone="good">Plan active</WBadge>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <WButton variant="ghost" size="sm">
              Send message
            </WButton>
            <WButton variant="primary" size="sm">
              Update plan
            </WButton>
          </div>
        </div>

        <WHairline />

        <div
          style={{
            marginTop: 26,
            display: "grid",
            gridTemplateColumns: "1.3fr 1fr 1fr",
            alignItems: "stretch",
          }}
        >
          {/* Left column */}
          <div style={{ paddingRight: 32, borderRight: "1px solid var(--border)" }}>
            <WLabel>Weight trend · last 7 weeks</WLabel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "12px 0 18px" }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 36, color: "var(--charcoal)" }}>
                68.0
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.5px",
                  color: "var(--coral)",
                }}
              >
                ↓ 2.0 KG
              </span>
            </div>
            <WBarChart data={CHART} height={110} />

            <div style={{ marginTop: 26 }}>
              <WLabel>Recent activity</WLabel>
              <div style={{ marginTop: 6 }}>
                <ActivityLogRow
                  name="Morning run · 8.2km"
                  date="Today"
                  meta="42 min · 410 kcal · Moderate"
                />
                <WHairline />
                <ActivityLogRow
                  name="Upper body strength"
                  date="Yesterday"
                  meta="45 min · 320 kcal"
                />
                <WHairline />
                <ActivityLogRow name="Recovery walk" date="Mon" meta="30 min · 140 kcal · Easy" />
                <WHairline />
                <ActivityLogRow
                  name="Cycle intervals · 18km"
                  date="Sat"
                  meta="50 min · 520 kcal · Hard"
                />
              </div>
            </div>
          </div>

          {/* Middle column */}
          <div style={{ padding: "0 32px", borderRight: "1px solid var(--border)" }}>
            <WLabel>Current meal plan</WLabel>
            <div
              style={{
                marginTop: 12,
                marginBottom: 4,
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 15,
                color: "var(--charcoal)",
              }}
            >
              Lean & Steady · Wk 22
            </div>
            <div style={{ marginBottom: 22, fontSize: 12, color: "var(--muted)" }}>
              1,850 kcal target · 5 meals/day
            </div>
            <MacroLine label="Protein" value="145g" pct={88} />
            <MacroLine label="Carbs" value="210g" pct={75} />
            <MacroLine label="Fat" value="55g" pct={62} />
            <WHairline style={{ margin: "8px 0 16px" }} />
            <div style={{ fontSize: 12, color: "var(--subtle)", lineHeight: 1.6 }}>
              Breakfast · 350 &nbsp;·&nbsp; Lunch · 620
              <br />
              Snack · 220 &nbsp;·&nbsp; Dinner · 500
            </div>
          </div>

          {/* Right column */}
          <div style={{ paddingLeft: 32 }}>
            <WLabel>Specialist notes</WLabel>
            <p
              style={{
                marginTop: 14,
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--charcoal)",
                lineHeight: 1.6,
              }}
            >
              Strong adherence this block. Sleep improving — energy on morning runs is up. Watch
              hydration on rest days; keep protein at the top of the range while cutting.
            </p>
            <div style={{ marginTop: 18, fontSize: 11, color: "var(--muted)" }}>
              Updated 2 days ago · Jordan
            </div>
            <WHairline style={{ margin: "22px 0" }} />
            <WLabel>Quick actions</WLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              <WButton variant="ghost" size="sm">
                Log a note
              </WButton>
              <WButton variant="ghost" size="sm">
                Schedule check-in
              </WButton>
            </div>
          </div>
        </div>
      </div>
    </WebShell>
  );
}
