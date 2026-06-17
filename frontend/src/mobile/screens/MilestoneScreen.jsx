import React, { useEffect, useState } from "react";
import { PrimaryButton } from "../Primitives";
import { getMilestones } from "../../api/gymUser";

function daysSince(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export default function MilestoneScreen({ onShare }) {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMilestones()
      .then((rows) => {
        if (Array.isArray(rows) && rows.length > 0) {
          // Already sorted by achieved_at DESC server-side.
          setLatest(rows[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const numberOrLabel = latest ? (daysSince(latest.achieved_at) ?? 0) : null;
  const headline = latest?.badge || latest?.type || (loading ? "…" : "Keep going");
  const subline = latest
    ? `${headline.toUpperCase()}`
    : loading
    ? "LOADING YOUR PROGRESS"
    : "LOG MORE TO EARN YOUR FIRST BADGE";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--coral)",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 30px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "4px",
            color: "var(--charcoal)",
            textTransform: "uppercase",
          }}
        >
          MILESTONE
        </span>
        <div
          style={{
            margin: "34px 0",
            fontFamily: "var(--font-numeral)",
            fontWeight: 700,
            fontSize: latest ? 150 : 92,
            lineHeight: 0.9,
            letterSpacing: "-4px",
            color: "var(--charcoal)",
          }}
        >
          {latest ? numberOrLabel : (loading ? "…" : "0")}
        </div>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "1px",
            color: "var(--cream)",
          }}
        >
          {latest ? `DAYS · ${subline}` : subline}
        </span>
        <span
          style={{
            marginTop: 14,
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--charcoal)",
            opacity: 0.55,
          }}
        >
          {latest ? "a streak built one move at a time." : "every log counts toward your next badge."}
        </span>
      </div>
      <div style={{ padding: "0 30px 30px" }}>
        <PrimaryButton variant="dark" onClick={onShare}>
          {latest ? "Share the win" : "Keep going"}
        </PrimaryButton>
      </div>
    </div>
  );
}
